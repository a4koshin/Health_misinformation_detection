import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/format.dart';
import '../../models/prediction_model.dart';
import '../../services/history_service.dart';
import '../../widgets/empty_placeholder.dart';
import '../../widgets/page_header.dart';

class CorrectionsScreen extends StatefulWidget {
  const CorrectionsScreen({super.key});

  @override
  State<CorrectionsScreen> createState() => _CorrectionsScreenState();
}

class _CorrectionsScreenState extends State<CorrectionsScreen> {
  final HistoryService _historyService = HistoryService();

  bool _isLoading = true;
  String? _error;
  List<PredictionModel> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final items = await _historyService.listHistory(perPage: 50);
      if (!mounted) return;
      setState(() {
        _items = items.where(_isCorrection).toList();
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  bool _isCorrection(PredictionModel item) {
    return item.reviewStatus == 'corrected' &&
        (item.correctedClaim ?? '').trim().isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.brand,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const PageHeader(
            title: 'Corrections',
            description: 'Sentences a healthcare advisor rewrote for you.',
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _buildBody(),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(
          child: CircularProgressIndicator(
            color: AppColors.brand,
            strokeWidth: 2,
          ),
        ),
      );
    }

    if (_error != null) {
      return EmptyPlaceholder(
        icon: Iconsax.warning_2,
        title: 'Could not load corrections',
        description: _error!,
      );
    }

    if (_items.isEmpty) {
      return const EmptyPlaceholder(
        icon: Iconsax.message_edit,
        title: 'No corrections yet',
        description:
            'When an advisor corrects a Non-Reliable claim, it will appear here.',
      );
    }

    return Column(
      children: [
        for (final item in _items) _CorrectionRow(item: item),
      ],
    );
  }
}

class _CorrectionRow extends StatelessWidget {
  const _CorrectionRow({required this.item});

  final PredictionModel item;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Iconsax.message_edit,
                  size: 18,
                  color: AppColors.brand,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Previous claim',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.placeholder,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.claim,
                      style: const TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                        color: AppColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.brandSoft.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Corrected sentence',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.brandDeep,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  (item.correctedClaim ?? '').trim(),
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.45,
                    color: AppColors.ink,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            formatDateTime(item.createdAt),
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.placeholder,
            ),
          ),
        ],
      ),
    );
  }
}
