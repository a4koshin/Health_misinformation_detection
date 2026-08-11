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
      context.read<NotificationProvider>().load();
    });
  }

  Future<void> _openNotifications() async {
    final href = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
    );
    if (!mounted) return;
    context.read<NotificationProvider>().refreshUnread();
    if (href == '/corrections') {
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
          titleSpacing: isHome ? 4 : 20,
          leading: isHome
              ? NotificationBell(onPressed: _openNotifications)
              : null,
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
          onChanged: (index) => setState(() => _index = index),
        ),
      ),
    );
  }
}
