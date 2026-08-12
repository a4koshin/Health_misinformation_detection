import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/page_header.dart';

class PredictionScreen extends StatefulWidget {
  const PredictionScreen({super.key});

  @override
  State<PredictionScreen> createState() => _PredictionScreenState();
}

class _PredictionScreenState extends State<PredictionScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
  final ApiClient _client = ApiClient();

  final List<_ChatItem> _items = [];
  bool _isSubmitting = false;
  bool _isUploading = false;

  bool get _isBusy => _isSubmitting || _isUploading;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _scrollToBottom() async {
    await Future<void>.delayed(const Duration(milliseconds: 40));
    if (!_scrollController.hasClients) return;
    await _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
    );
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isBusy) return;

    setState(() {
      _isSubmitting = true;
      _items.add(_ChatItem.user(text));
      _controller.clear();
    });
    await _scrollToBottom();

    try {
      final data = await _client.post(
        '/api/predict',
        body: {'text': text},
        auth: true,
      );
      if (!mounted) return;

      var result = _PredictionResult.fromJson(data);
      setState(() {
        _items.add(_ChatItem.prediction(result));
        _isSubmitting = false;
      });
      await _scrollToBottom();

      if (result.shouldEnrich) {
        await _enrichPrediction(result);
      }
      return;
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _items.add(_ChatItem.error(error.message)));
    } catch (_) {
      if (!mounted) return;
      setState(
        () => _items.add(
          _ChatItem.error('Unable to check that claim right now.'),
        ),
      );
    }
    if (!mounted) return;
    setState(() => _isSubmitting = false);
    await _scrollToBottom();
  }

  Future<void> _enrichPrediction(_PredictionResult result) async {
    final predictionId = result.predictionId;
    if (predictionId == null || predictionId.isEmpty) return;

    final index = _items.lastIndexWhere(
      (item) =>
          item.kind == _ChatKind.prediction &&
          item.prediction?.predictionId == predictionId,
    );
    if (index < 0) return;

    setState(() {
      _items[index] = _ChatItem.prediction(result.copyWith(isEnriching: true));
    });

    try {
      final enriched = await _client.post(
        '/api/predict/$predictionId/enrich',
        auth: true,
        timeout: const Duration(seconds: 90),
      );
      if (!mounted) return;

      final next = result.applyEnrichment(enriched);
      setState(() {
        final currentIndex = _items.lastIndexWhere(
          (item) =>
              item.kind == _ChatKind.prediction &&
              item.prediction?.predictionId == predictionId,
        );
        if (currentIndex >= 0) {
          _items[currentIndex] = _ChatItem.prediction(next);
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        final currentIndex = _items.lastIndexWhere(
          (item) =>
              item.kind == _ChatKind.prediction &&
              item.prediction?.predictionId == predictionId,
        );
        if (currentIndex >= 0) {
          _items[currentIndex] = _ChatItem.prediction(
            result.copyWith(isEnriching: false),
          );
        }
      });
    }
    await _scrollToBottom();
  }

  Future<void> _uploadDataset() async {
    if (_isBusy) return;

    try {
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ['csv', 'xlsx', 'xls', 'txt'],
        withData: true,
      );
      if (picked == null || picked.files.isEmpty) return;

      final file = picked.files.single;
      final path = file.path;
      final bytes = file.bytes;
      if ((path == null || path.isEmpty) && (bytes == null || bytes.isEmpty)) {
        setState(
          () => _items.add(
            _ChatItem.error('Unable to read that file on this device.'),
          ),
        );
        return;
      }

      setState(() {
        _isUploading = true;
        _items.add(
          _ChatItem.file(
            filename: file.name,
            sizeBytes: file.size,
            isLoading: true,
          ),
        );
      });
      await _scrollToBottom();

      final data = await _client.postMultipart(
        '/api/admin/dataset/predict',
        fieldName: 'file',
        filePath: path,
        bytes: bytes,
        filename: file.name,
        auth: true,
      );
      if (!mounted) return;
      final dataset = _DatasetResult.fromJson(data);
      setState(() {
        if (_items.isNotEmpty && _items.last.kind == _ChatKind.file) {
          _items[_items.length - 1] = _ChatItem.file(
            filename: file.name,
            sizeBytes: file.size,
            isLoading: false,
          );
        }
        _items.add(_ChatItem.dataset(filename: file.name, result: dataset));
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        if (_items.isNotEmpty && _items.last.kind == _ChatKind.file) {
          _items.removeLast();
        }
        _items.add(_ChatItem.error(error.message));
      });
    } on MissingPluginException {
      if (!mounted) return;
      setState(() {
        if (_items.isNotEmpty && _items.last.kind == _ChatKind.file) {
          _items.removeLast();
        }
        _items.add(
          _ChatItem.error(
            'File upload needs a full app restart. Stop the app, then run flutter run again.',
          ),
        );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        if (_items.isNotEmpty && _items.last.kind == _ChatKind.file) {
          _items.removeLast();
        }
        _items.add(
          _ChatItem.error(
            error is MissingPluginException
                ? 'File upload needs a full app restart. Stop the app, then run flutter run again.'
                : 'Unable to process that dataset.',
          ),
        );
      });
    }
    if (!mounted) return;
    setState(() => _isUploading = false);
    await _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const PageHeader(
          title: 'Prediction',
          description: 'Check a Somali health claim with SomBERTb.',
        ),
        _ComposerBar(
          controller: _controller,
          focusNode: _focusNode,
          isBusy: _isBusy,
          isUploading: _isUploading,
          onSend: _submit,
          onUploadDataset: _uploadDataset,
        ),
        Expanded(
          child: _items.isEmpty && !_isBusy
              ? const _EmptyHint()
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  itemCount: _items.length + (_isSubmitting ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (_isSubmitting && index == _items.length) {
                      return const _TypingRow();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _ChatBubble(item: _items[index]),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, 12),
      child: Text(
        'Type a claim above, or tap + to upload a CSV / Excel dataset.',
        style: TextStyle(
          fontSize: 12,
          height: 1.45,
          color: AppColors.inkMuted,
        ),
      ),
    );
  }
}

class _ComposerBar extends StatelessWidget {
  const _ComposerBar({
    required this.controller,
    required this.focusNode,
    required this.isBusy,
    required this.isUploading,
    required this.onSend,
    required this.onUploadDataset,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isBusy;
  final bool isUploading;
  final VoidCallback onSend;
  final VoidCallback onUploadDataset;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _RoundAction(
              onTap: isBusy ? null : onUploadDataset,
              background: AppColors.brandSoft,
              child: isUploading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.brand,
                      ),
                    )
                  : const Icon(
                      Iconsax.add,
                      size: 18,
                      color: AppColors.brand,
                    ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                enabled: !isBusy,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                decoration: const InputDecoration(
                  hintText: 'Geli sheegasho caafimaad…',
                  hintStyle: TextStyle(
                    fontSize: 13,
                    color: AppColors.placeholder,
                  ),
                  filled: false,
                  isDense: true,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 10,
                  ),
                ),
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: AppColors.ink,
                ),
              ),
            ),
            const SizedBox(width: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (context, value, _) {
                final canSend = value.text.trim().isNotEmpty && !isBusy;
                return _RoundAction(
                  onTap: canSend ? onSend : null,
                  background: canSend ? AppColors.brand : AppColors.border,
                  child: isBusy && !isUploading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Icon(
                          Iconsax.send_1,
                          size: 16,
                          color: canSend ? Colors.white : AppColors.placeholder,
                        ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _RoundAction extends StatelessWidget {
  const _RoundAction({
    required this.child,
    required this.background,
    this.onTap,
  });

  final Widget child;
  final Color background;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 36,
          height: 36,
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.item});

  final _ChatItem item;

  @override
  Widget build(BuildContext context) {
    switch (item.kind) {
      case _ChatKind.user:
        return _UserMessage(text: item.text ?? '');
      case _ChatKind.prediction:
        return _PredictionMessage(result: item.prediction!);
      case _ChatKind.file:
        return _FileMessage(
          filename: item.filename ?? 'dataset',
          sizeBytes: item.sizeBytes ?? 0,
          isLoading: item.isLoading,
        );
      case _ChatKind.dataset:
        return _DatasetMessage(
          filename: item.filename ?? 'dataset',
          result: item.dataset!,
        );
      case _ChatKind.error:
        return _ErrorMessage(text: item.text ?? 'Something went wrong.');
    }
  }
}

class _UserMessage extends StatelessWidget {
  const _UserMessage({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.brandSoft,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0x33FF5C00)),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            height: 1.45,
            color: AppColors.ink,
          ),
        ),
      ),
    );
  }
}

class _PredictionMessage extends StatelessWidget {
  const _PredictionMessage({required this.result});

  final _PredictionResult result;

  @override
  Widget build(BuildContext context) {
    final isNonMedical =
        result.label.toLowerCase().contains('non-medical');
    final isNonReliable = result.label.toLowerCase() == 'non-reliable';
    final labelColor = result.isReliable
        ? const Color(0xFF059669)
        : isNonMedical
            ? const Color(0xFFB45309)
            : AppColors.danger;
    final labelBg = result.isReliable
        ? const Color(0xFFEAFAF3)
        : isNonMedical
            ? const Color(0xFFFFF7ED)
            : const Color(0xFFFEF2F2);

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: labelBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    result.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: labelColor,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Confidence ${(result.confidence * 100).toStringAsFixed(1)}%',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.placeholder,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text(
              'Explanation',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.inkMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              result.message,
              style: const TextStyle(
                fontSize: 13,
                height: 1.5,
                color: AppColors.ink,
              ),
            ),
            if (result.isEnriching) ...[
              const SizedBox(height: 10),
              const Row(
                children: [
                  SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.brand,
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Loading explanation, sources, and similar words…',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.inkMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            if (isNonReliable && result.similarTerms.isNotEmpty) ...[
              const SizedBox(height: 14),
              const Text(
                'Similar reliable words from Facebook, YouTube & Web',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.inkMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final term in result.similarTerms)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        term,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                ],
              ),
            ],
            if ((result.isReliable || isNonReliable) &&
                result.sources.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                result.isReliable
                    ? 'Supporting posts'
                    : 'Reliable posts',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.inkMuted,
                ),
              ),
              const SizedBox(height: 8),
              for (final source in result.sources)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _SourceCard(source: source),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SourceCard extends StatelessWidget {
  const _SourceCard({required this.source});

  final _PredictionSource source;

  Future<void> _open() async {
    final uri = Uri.tryParse(source.url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Widget _thumb() {
    final imageUrl = source.resolvedImageUrl;
    if (imageUrl == null || imageUrl.isEmpty) {
      return Container(
        color: AppColors.brandSoft,
        child: const Icon(
          Iconsax.global,
          size: 18,
          color: AppColors.brand,
        ),
      );
    }
    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      errorBuilder: (_, error, stackTrace) => Container(
        color: AppColors.brandSoft,
        child: const Icon(
          Iconsax.global,
          size: 18,
          color: AppColors.brand,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = source.resolvedProfile;

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: source.url.isEmpty ? null : _open,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(width: 48, height: 48, child: _thumb()),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            source.platformLabel,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.inkMuted,
                            ),
                          ),
                        ),
                        if (profile.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              profile,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.ink,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      source.title.isEmpty ? source.url : source.title,
                      style: const TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        color: AppColors.brand,
                      ),
                    ),
                    if (source.url.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      SelectableText(
                        source.url,
                        style: const TextStyle(
                          fontSize: 11,
                          height: 1.35,
                          color: AppColors.inkMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FileMessage extends StatelessWidget {
  const _FileMessage({
    required this.filename,
    required this.sizeBytes,
    required this.isLoading,
  });

  final String filename;
  final int sizeBytes;
  final bool isLoading;

  String get _ext {
    final parts = filename.split('.');
    return parts.length > 1 ? parts.last.toUpperCase() : 'FILE';
  }

  String get _sizeLabel {
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 280),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.brandSoft,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0x33FF5C00)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Iconsax.document_upload,
                size: 16,
                color: AppColors.brand,
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    filename,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$_ext · $_sizeLabel${isLoading ? ' · processing…' : ''}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.inkMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DatasetMessage extends StatelessWidget {
  const _DatasetMessage({required this.filename, required this.result});

  final String filename;
  final _DatasetResult result;

  @override
  Widget build(BuildContext context) {
    final preview = result.results.take(5).toList();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dataset analysis',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.brand,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  filename,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Chip('${result.processedRows}/${result.totalRows} processed'),
                _Chip(
                  '${result.reliableCount} Reliable',
                  bg: const Color(0xFFEAFAF3),
                  fg: const Color(0xFF059669),
                ),
                _Chip(
                  '${result.misinformationCount} Non-Reliable',
                  bg: const Color(0xFFFEF2F2),
                  fg: AppColors.danger,
                ),
                if (result.errorCount > 0)
                  _Chip('${result.errorCount} errors'),
              ],
            ),
          ),
          for (final row in preview)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    row.text,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.4,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    row.displayLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: row.color,
                    ),
                  ),
                ],
              ),
            ),
          if (result.results.length > preview.length)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
              child: Text(
                'Showing first ${preview.length} of ${result.results.length} rows.',
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.placeholder,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.label, {this.bg, this.fg});

  final String label;
  final Color? bg;
  final Color? fg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg ?? AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: fg ?? AppColors.ink,
        ),
      ),
    );
  }
}

class _ErrorMessage extends StatelessWidget {
  const _ErrorMessage({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x33DC2626)),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, color: AppColors.danger),
      ),
    );
  }
}

class _TypingRow extends StatelessWidget {
  const _TypingRow();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: const Text(
        'Checking claim…',
        style: TextStyle(fontSize: 12, color: AppColors.inkMuted),
      ),
    );
  }
}

enum _ChatKind { user, prediction, file, dataset, error }

class _ChatItem {
  const _ChatItem._({
    required this.kind,
    this.text,
    this.prediction,
    this.filename,
    this.sizeBytes,
    this.isLoading = false,
    this.dataset,
  });

  factory _ChatItem.user(String text) =>
      _ChatItem._(kind: _ChatKind.user, text: text);

  factory _ChatItem.prediction(_PredictionResult result) =>
      _ChatItem._(kind: _ChatKind.prediction, prediction: result);

  factory _ChatItem.file({
    required String filename,
    required int sizeBytes,
    required bool isLoading,
  }) =>
      _ChatItem._(
        kind: _ChatKind.file,
        filename: filename,
        sizeBytes: sizeBytes,
        isLoading: isLoading,
      );

  factory _ChatItem.dataset({
    required String filename,
    required _DatasetResult result,
  }) =>
      _ChatItem._(
        kind: _ChatKind.dataset,
        filename: filename,
        dataset: result,
      );

  factory _ChatItem.error(String text) =>
      _ChatItem._(kind: _ChatKind.error, text: text);

  final _ChatKind kind;
  final String? text;
  final _PredictionResult? prediction;
  final String? filename;
  final int? sizeBytes;
  final bool isLoading;
  final _DatasetResult? dataset;
}

class _PredictionResult {
  const _PredictionResult({
    required this.isMedical,
    required this.label,
    required this.message,
    required this.confidence,
    this.predictionId,
    this.enrichmentPending = false,
    this.isEnriching = false,
    this.sources = const [],
    this.similarTerms = const [],
  });

  final bool isMedical;
  final String label;
  final String message;
  final double confidence;
  final String? predictionId;
  final bool enrichmentPending;
  final bool isEnriching;
  final List<_PredictionSource> sources;
  final List<String> similarTerms;

  bool get isReliable => label.toLowerCase() == 'reliable';

  bool get shouldEnrich =>
      isMedical &&
      enrichmentPending &&
      predictionId != null &&
      predictionId!.isNotEmpty &&
      (isReliable || label.toLowerCase() == 'non-reliable');

  _PredictionResult copyWith({
    String? message,
    bool? isEnriching,
    bool? enrichmentPending,
    List<_PredictionSource>? sources,
    List<String>? similarTerms,
  }) {
    return _PredictionResult(
      isMedical: isMedical,
      label: label,
      message: message ?? this.message,
      confidence: confidence,
      predictionId: predictionId,
      enrichmentPending: enrichmentPending ?? this.enrichmentPending,
      isEnriching: isEnriching ?? this.isEnriching,
      sources: sources ?? this.sources,
      similarTerms: similarTerms ?? this.similarTerms,
    );
  }

  _PredictionResult applyEnrichment(Map<String, dynamic> json) {
    final nextMessage = '${json['message'] ?? message}'.trim();
    final nextSources = _PredictionSource.listFrom(json['sources']);
    final nextTerms = label.toLowerCase() == 'non-reliable'
        ? _stringList(json['similar_terms'])
        : const <String>[];
    return copyWith(
      message: nextMessage.isEmpty ? message : nextMessage,
      sources: nextSources,
      similarTerms: nextTerms,
      isEnriching: false,
      enrichmentPending: false,
    );
  }

  factory _PredictionResult.fromJson(Map<String, dynamic> json) {
    final rawConfidence = json['label_confidence'];
    final confidence = rawConfidence is num
        ? rawConfidence.toDouble()
        : double.tryParse('$rawConfidence') ?? 0.0;
    final isMedical = json['is_medical'] == true;
    final rawLabel = '${json['label'] ?? ''}'.trim();
    final resolvedLabel = rawLabel.isEmpty
        ? (isMedical ? 'Pending' : 'Non-Medical')
        : rawLabel == 'Misinformation'
            ? 'Non-Reliable'
            : rawLabel;
    final predictionId = json['prediction_id']?.toString();
    return _PredictionResult(
      isMedical: isMedical,
      label: resolvedLabel,
      message: '${json['message'] ?? ''}',
      confidence: confidence,
      predictionId: predictionId,
      enrichmentPending: json['enrichment_pending'] == true,
      sources: _PredictionSource.listFrom(json['sources']),
      similarTerms: resolvedLabel.toLowerCase() == 'non-reliable'
          ? _stringList(json['similar_terms'])
          : const [],
    );
  }

  static List<String> _stringList(dynamic value) {
    if (value is! List) return const [];
    return value
        .map((item) => '$item'.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }
}

class _PredictionSource {
  const _PredictionSource({
    required this.title,
    required this.url,
    required this.platform,
    required this.profile,
    this.imageUrl,
  });

  final String title;
  final String url;
  final String platform;
  final String profile;
  final String? imageUrl;

  String get platformLabel {
    final value = _resolvedPlatform;
    if (value == 'facebook') return 'Facebook';
    if (value == 'youtube') return 'YouTube';
    return 'Web';
  }

  String get _resolvedPlatform {
    final value = platform.trim().toLowerCase();
    if (value.contains('facebook')) return 'facebook';
    if (value.contains('youtube')) return 'youtube';
    final host = Uri.tryParse(url)?.host.toLowerCase() ?? '';
    if (host.contains('facebook.com') || host.endsWith('fb.com')) {
      return 'facebook';
    }
    if (host.contains('youtube.com') || host.endsWith('youtu.be')) {
      return 'youtube';
    }
    return 'web';
  }

  String get resolvedProfile {
    if (profile.isNotEmpty) return profile;
    final titleLower = title.toLowerCase();
    for (final marker in [
      ' - facebook',
      ' | facebook',
      ' - youtube',
      ' | youtube',
    ]) {
      final index = titleLower.indexOf(marker);
      if (index > 0) {
        return title.substring(0, index).trim();
      }
    }
    final host = Uri.tryParse(url)?.host.replaceFirst(RegExp(r'^www\.'), '');
    if (host != null && host.isNotEmpty) return host;
    return platformLabel;
  }

  String? get resolvedImageUrl {
    if (imageUrl != null && imageUrl!.isNotEmpty) return imageUrl;
    if (_resolvedPlatform == 'youtube') {
      final id = _youtubeId;
      if (id != null) return 'https://i.ytimg.com/vi/$id/hqdefault.jpg';
    }
    final host = Uri.tryParse(url)?.host;
    if (host != null && host.isNotEmpty) {
      return 'https://www.google.com/s2/favicons?domain=$host&sz=128';
    }
    return null;
  }

  String? get _youtubeId {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    if (uri.host.contains('youtu.be')) {
      final id = uri.pathSegments.isEmpty ? '' : uri.pathSegments.first;
      return id.isEmpty ? null : id;
    }
    final v = uri.queryParameters['v'];
    if (v != null && v.isNotEmpty) return v;
    if (uri.pathSegments.length >= 2 &&
        ['embed', 'shorts', 'live', 'v'].contains(uri.pathSegments.first)) {
      return uri.pathSegments[1];
    }
    return null;
  }

  factory _PredictionSource.fromJson(Map<String, dynamic> json) {
    return _PredictionSource(
      title: '${json['title'] ?? ''}'.trim(),
      url: '${json['url'] ?? ''}'.trim(),
      platform: '${json['platform'] ?? ''}'.trim(),
      profile: '${json['profile'] ?? ''}'.trim(),
      imageUrl: json['image']?.toString(),
    );
  }

  static List<_PredictionSource> listFrom(dynamic value) {
    if (value is! List) return const [];
    final items = <_PredictionSource>[];
    for (final row in value) {
      if (row is Map<String, dynamic>) {
        items.add(_PredictionSource.fromJson(row));
      } else if (row is Map) {
        items.add(_PredictionSource.fromJson(Map<String, dynamic>.from(row)));
      }
    }
    return items;
  }
}

class _DatasetResult {
  const _DatasetResult({
    required this.totalRows,
    required this.processedRows,
    required this.reliableCount,
    required this.misinformationCount,
    required this.errorCount,
    required this.results,
  });

  final int totalRows;
  final int processedRows;
  final int reliableCount;
  final int misinformationCount;
  final int errorCount;
  final List<_DatasetRow> results;

  factory _DatasetResult.fromJson(Map<String, dynamic> json) {
    final rawRows = json['results'];
    final rows = <_DatasetRow>[];
    if (rawRows is List) {
      for (final row in rawRows) {
        if (row is Map<String, dynamic>) {
          rows.add(_DatasetRow.fromJson(row));
        } else if (row is Map) {
          rows.add(_DatasetRow.fromJson(Map<String, dynamic>.from(row)));
        }
      }
    }
    return _DatasetResult(
      totalRows: _asInt(json['total_rows']),
      processedRows: _asInt(json['processed_rows']),
      reliableCount: _asInt(json['reliable_count']),
      misinformationCount: _asInt(json['misinformation_count']),
      errorCount: _asInt(json['error_count']),
      results: rows,
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }
}

class _DatasetRow {
  const _DatasetRow({
    required this.text,
    required this.prediction,
    required this.error,
  });

  final String text;
  final String? prediction;
  final String? error;

  String get displayLabel {
    final value = (prediction ?? error ?? 'Skipped').trim();
    if (value == 'Misinformation') return 'Non-Reliable';
    return value.isEmpty ? 'Skipped' : value;
  }

  Color get color {
    final lower = displayLabel.toLowerCase();
    if (lower == 'reliable') return const Color(0xFF059669);
    if (lower.contains('non-reliable') || lower.contains('misinformation')) {
      return AppColors.danger;
    }
    return AppColors.inkMuted;
  }

  factory _DatasetRow.fromJson(Map<String, dynamic> json) {
    return _DatasetRow(
      text: '${json['text'] ?? ''}',
      prediction: json['prediction']?.toString(),
      error: json['error']?.toString(),
    );
  }
}
