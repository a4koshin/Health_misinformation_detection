import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../core/theme/app_colors.dart';
import '../providers/notification_provider.dart';

class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key, required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<NotificationProvider>().unreadCount;

    return IconButton(
      tooltip: unread > 0 ? '$unread unread notifications' : 'Notifications',
      onPressed: onPressed,
      icon: Badge(
        isLabelVisible: unread > 0,
        backgroundColor: AppColors.brand,
        textColor: Colors.white,
        smallSize: 8,
        label: Text(
          unread > 9 ? '9+' : '$unread',
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
        ),
        child: const Icon(
          Iconsax.notification_copy,
          size: 24,
          color: AppColors.ink,
        ),
      ),
    );
  }
}
