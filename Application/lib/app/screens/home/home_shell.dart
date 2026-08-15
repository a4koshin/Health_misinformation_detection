import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/notification_provider.dart';
import '../../widgets/app_bottom_nav.dart';
import '../../widgets/app_logo.dart';
import '../../widgets/notification_bell.dart';
import '../account/account_screen.dart';
import '../corrections/corrections_screen.dart';
import '../history/history_screen.dart';
import '../notifications/notifications_screen.dart';
import '../prediction/prediction_screen.dart';
import 'dashboard_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  NotificationProvider? _notifications;

  static const _pages = [
    DashboardScreen(),
    CorrectionsScreen(),
    PredictionScreen(),
    HistoryScreen(),
    AccountScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _notifications = context.read<NotificationProvider>();
      _notifications!.addListener(_onNotificationsChanged);
      _notifications!.startRealtime();
    });
  }

  @override
  void dispose() {
    _notifications?.removeListener(_onNotificationsChanged);
    super.dispose();
  }

  void _onNotificationsChanged() {
    if (!mounted || _notifications == null) return;
    final alert = _notifications!.consumeAlert();
    if (alert == null) return;
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.ink,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              alert.title.isEmpty ? 'New notification' : alert.title,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            if (alert.body.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                alert.body,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white70),
              ),
            ],
          ],
        ),
        action: SnackBarAction(
          label: 'Open',
          textColor: AppColors.brand,
          onPressed: () {
            final href = (alert.href ?? '').toLowerCase();
            if (href.contains('corrections')) {
              _notifications?.requestCorrectionsRefresh();
              setState(() => _index = 1);
              return;
            }
            unawaited(_openNotifications());
          },
        ),
        duration: const Duration(seconds: 6),
      ),
    );
  }

  Future<void> _openNotifications() async {
    final href = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
    if (!mounted) return;
    context.read<NotificationProvider>().refreshUnread();
    if (href == '/corrections') {
      context.read<NotificationProvider>().requestCorrectionsRefresh();
      setState(() => _index = 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstName = context.watch<AuthProvider>().user?.firstName ?? 'there';
    final isHome = _index == 0;

    return ChangeNotifierProvider(
      create: (_) {
        final userId = context.read<AuthProvider>().user?.id;
        return DashboardProvider()..load(userId: userId);
      },
      child: Scaffold(
        extendBody: true,
        appBar: AppBar(
          automaticallyImplyLeading: false,
          titleSpacing: 4,
          leading: NotificationBell(onPressed: _openNotifications),
          title: isHome
              ? Text(
                  'Hello, $firstName',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.3,
                    color: AppColors.ink,
                  ),
                )
              : const AppLogo(compact: true),
        ),
        body: Padding(
          padding: const EdgeInsets.only(bottom: 88),
          child: IndexedStack(index: _index, children: _pages),
        ),
        bottomNavigationBar: AppBottomNav(
          index: _index,
          onChanged: (index) {
            setState(() => _index = index);
            if (index == 1) {
              context.read<NotificationProvider>().requestCorrectionsRefresh();
            }
          },
        ),
      ),
    );
  }
}
