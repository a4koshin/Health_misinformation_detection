import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/format.dart';
import '../../models/prediction_model.dart';
import '../../services/history_service.dart';
import '../../widgets/empty_placeholder.dart';
import '../../widgets/page_header.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final HistoryService _historyService = HistoryService();
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  String? _error;
  List<PredictionModel> _items = const [];
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
    _searchController.addListener(() {
      setState(() {
        _query = _searchController.text.trim().toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
        _items = items;
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

  List<PredictionModel> get _filteredItems {
    if (_query.isEmpty) return _items;
    return _items.where((item) {
      final claim = item.claim.toLowerCase();
      final label = item.displayLabel.toLowerCase();
      final source = (item.source ?? '').toLowerCase();
      return claim.contains(_query) ||
          label.contains(_query) ||
          source.contains(_query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final results = _filteredItems;

    return RefreshIndicator(
      color: AppColors.brand,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const PageHeader(
            title: 'Search',
            description: 'Find previous claims and prediction results.',
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Search claims, labels, or source',
                    prefixIcon: const Icon(
                      Iconsax.search_normal_copy,
                      size: 18,
                      color: AppColors.placeholder,
                    ),
                    suffixIcon: _query.isEmpty
                        ? null
                        : IconButton(
                            onPressed: _searchController.clear,
                            icon: const Icon(
                              Iconsax.close_circle_copy,
                              size: 18,
                              color: AppColors.placeholder,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 16),
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.brand,
                        strokeWidth: 2,
                      ),
                    ),
                  )
                else if (_error != null)
                  EmptyPlaceholder(
                    icon: Iconsax.warning_2_copy,
                    title: 'Could not load search',
                    description: _error!,
                  )
                else if (_items.isEmpty)
                  const EmptyPlaceholder(
                    icon: Iconsax.search_normal_copy,
                    title: 'No claims yet',
                    description:
                        'Your checked claims will appear here for quick search.',
                  )
                else if (results.isEmpty)
                  const EmptyPlaceholder(
                    icon: Iconsax.search_normal_copy,
                    title: 'No matches found',
                    description: 'Try a different word or phrase.',
                  )
                else
                  Column(
                    children: [
                      for (final item in results) _SearchRow(item: item),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchRow extends StatelessWidget {
  const _SearchRow({required this.item});

  final PredictionModel item;

  @override
  Widget build(BuildContext context) {
    final isReliable = item.isReliable;
    final statusColor = isReliable ? const Color(0xFF059669) : AppColors.danger;
    final statusBg = isReliable
        ? const Color(0xFFEAFAF3)
        : const Color(0xFFFFEFEF);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
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
              Iconsax.search_normal_copy,
              size: 18,
              color: AppColors.brand,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.claim,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        item.displayLabel,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.source == 'UploadedFile'
                            ? 'Uploaded file'
                            : (item.source ?? 'Manual check'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.placeholder,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  formatDateTime(item.createdAt),
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.placeholder,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
