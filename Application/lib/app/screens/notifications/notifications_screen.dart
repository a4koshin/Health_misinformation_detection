import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/format.dart';
import '../../models/notification_model.dart';
import '../../providers/notification_provider.dart';
import '../../widgets/empty_placeholder.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().load();
    });
  }

  Future<void> _open(NotificationModel item) async {
    final notifications = context.read<NotificationProvider>();
    if (item.unread) {
      await notifications.markRead(item.id);
    }
    if (!mounted) return;
    Navigator.of(context).pop(item.href ?? '/corrections');
  }

  @override
  Widget build(BuildContext context) {
    final notifications = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (notifications.unreadCount > 0)
            TextButton(
              onPressed: notifications.markAllRead,
              child: const Text(
                'Mark all read',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.brand,
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.brand,
        onRefresh: notifications.load,
        child: notifications.isLoading && notifications.items.isEmpty
            ? const Center(
                child: CircularProgressIndicator(
                  color: AppColors.brand,
                  strokeWidth: 2,
                ),
              )
            : notifications.error != null && notifications.items.isEmpty
            ? ListView(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: EmptyPlaceholder(
                      icon: Iconsax.notification,
                      title: 'Could not load notifications',
                      description: notifications.error!,
                    ),
                  ),
                ],
              )
            : notifications.items.isEmpty
            ? ListView(
                children: const [
                  Padding(
                    padding: EdgeInsets.all(20),
                    child: EmptyPlaceholder(
                      icon: Iconsax.notification,
                      title: 'No notifications yet',
                      description:
                          'When an advisor corrects a claim, it will show up here.',
                    ),
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                itemCount: notifications.items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final item = notifications.items[index];
                  return _NotificationTile(
                    item: item,
                    onTap: () => _open(item),
                  );
                },
              ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final NotificationModel item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: item.unread ? AppColors.brandSoft.withValues(alpha: 0.55) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(
                  color: item.unread ? AppColors.brand : AppColors.border,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.body,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        height: 1.4,
                        color: AppColors.inkMuted,
                      ),
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
        ),
      ),
    );
  }
}
