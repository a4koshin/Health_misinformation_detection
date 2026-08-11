import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/format.dart';
import '../../models/prediction_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _recentHidden = true;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final dash = context.watch<DashboardProvider>();
    final stats = dash.stats;
    final total = stats?.totalPredictions ?? 0;
    final reliable = stats?.reliableCount ?? 0;
    final nonReliable = stats?.nonReliableCount ?? 0;
    final chats = stats?.chatCount ?? 0;

    return RefreshIndicator(
      color: AppColors.brand,
      onRefresh: () => dash.load(userId: user?.id),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (dash.isLoading && stats == null)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.brand,
                        strokeWidth: 2,
                      ),
                    ),
                  )
                else if (dash.error != null && stats == null)
                  _EmptyNote(
                    icon: Iconsax.danger,
                    title: 'Could not load your data',
                    description: dash.error!,
                  )
                else ...[
                  _ChartsCard(
                    total: total,
                    reliable: reliable,
                    nonReliable: nonReliable,
                    chats: chats,
                  ),
                  const SizedBox(height: 16),
                  const _SectionLabel('Quick actions'),
                  const SizedBox(height: 8),
                  _StatsRow(
                    reliable: reliable,
                    nonReliable: nonReliable,
                    chats: chats,
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      const Expanded(
                        child: _SectionLabel('Recent chats'),
                      ),
                      IconButton(
                        tooltip: _recentHidden
                            ? 'Show recent chats'
                            : 'Hide recent chats',
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 36,
                          minHeight: 36,
                        ),
                        onPressed: () {
                          setState(() => _recentHidden = !_recentHidden);
                        },
                        icon: Icon(
                          _recentHidden ? Iconsax.eye_slash : Iconsax.eye,
                          size: 16,
                          color: _recentHidden
                              ? AppColors.inkMuted
                              : AppColors.brand,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (dash.recent.isEmpty)
                    const _EmptyNote(
                      icon: Iconsax.message,
                      title: 'No chats yet',
                      description:
                          'When you check a claim, it will show up here.',
                    )
                  else
                    _RecentList(
                      items: dash.recent,
                      hidden: _recentHidden,
                      onReveal: () {
                        setState(() => _recentHidden = false);
                      },
                    ),
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
        color: AppColors.inkMuted,
      ),
    );
  }
}

class _RecentList extends StatelessWidget {
  const _RecentList({
    required this.items,
    required this.hidden,
    required this.onReveal,
  });

  final List<PredictionModel> items;
  final bool hidden;
  final VoidCallback onReveal;

  @override
  Widget build(BuildContext context) {
    final list = Column(
      children: [
        for (final item in items) _ChatRow(item: item),
      ],
    );

    if (!hidden) return list;

    return GestureDetector(
      onTap: onReveal,
      child: ImageFiltered(
        imageFilter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: list,
      ),
    );
  }
}

const _peach = Color(0xFFFFEFE6);
const _peachMid = Color(0xFFFFDCC4);
const _peachDeep = Color(0xFFFFC19A);

class _ChartsCard extends StatelessWidget {
  const _ChartsCard({
    required this.total,
    required this.reliable,
    required this.nonReliable,
    required this.chats,
  });

  final int total;
  final int reliable;
  final int nonReliable;
  final int chats;

  @override
  Widget build(BuildContext context) {
    final maxValue = [total, reliable, nonReliable, chats, 1].reduce(
      (a, b) => a > b ? a : b,
    );

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.brandLight,
            AppColors.brand,
            AppColors.brandDeep,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.brand.withValues(alpha: 0.28),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned(
              top: -36,
              right: -28,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
            ),
            Positioned(
              bottom: -48,
              left: -24,
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.08),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Activity',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '$total total',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    height: 112,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _ChartBar(
                          label: 'All',
                          value: total,
                          maxValue: maxValue,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 14),
                        _ChartBar(
                          label: 'Reliable',
                          value: reliable,
                          maxValue: maxValue,
                          color: _peach,
                        ),
                        const SizedBox(width: 14),
                        _ChartBar(
                          label: 'Non-Rel.',
                          value: nonReliable,
                          maxValue: maxValue,
                          color: _peachMid,
                        ),
                        const SizedBox(width: 14),
                        _ChartBar(
                          label: 'Chats',
                          value: chats,
                          maxValue: maxValue,
                          color: _peachDeep,
                        ),
                      ],
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

class _ChartBar extends StatelessWidget {
  const _ChartBar({
    required this.label,
    required this.value,
    required this.maxValue,
    required this.color,
  });

  final String label;
  final int value;
  final int maxValue;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ratio = maxValue == 0 ? 0.0 : value / maxValue;

    return Expanded(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            '$value',
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          Flexible(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final trackHeight = constraints.maxHeight;
                final fillHeight = (trackHeight * ratio.clamp(0.12, 1))
                    .clamp(10.0, trackHeight);

                return Align(
                  alignment: Alignment.bottomCenter,
                  child: SizedBox(
                    width: 14,
                    height: trackHeight,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        Container(
                          width: 14,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        Container(
                          width: 14,
                          height: fillHeight,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.86),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.reliable,
    required this.nonReliable,
    required this.chats,
  });

  final int reliable;
  final int nonReliable;
  final int chats;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _StatCell(
          label: 'Reliable',
          value: '$reliable',
          icon: Iconsax.tick_circle,
          color: const Color(0xFF059669),
        ),
        _StatCell(
          label: 'Non-Reliable',
          value: '$nonReliable',
          icon: Iconsax.close_circle,
          color: AppColors.danger,
        ),
        _StatCell(
          label: 'Chats',
          value: '$chats',
          icon: Iconsax.message,
          color: AppColors.brand,
        ),
      ],
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.brandSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.4,
                height: 1.1,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppColors.inkMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatRow extends StatelessWidget {
  const _ChatRow({required this.item});

  final PredictionModel item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.brandSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Iconsax.message,
              size: 18,
              color: AppColors.brand,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              item.claim,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                height: 1.35,
                fontWeight: FontWeight.w500,
                color: AppColors.ink,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            formatDateTime(item.createdAt),
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.placeholder,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyNote extends StatelessWidget {
  const _EmptyNote({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        children: [
          Icon(icon, size: 18, color: AppColors.placeholder),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              height: 1.4,
              color: AppColors.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}
