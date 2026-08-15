import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../core/network/api_exception.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  NotificationProvider({NotificationService? service})
    : _service = service ?? NotificationService();

  final NotificationService _service;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  List<NotificationModel> items = [];
  int unreadCount = 0;
  bool isLoading = false;
  String? error;

  /// Latest alert to show as an in-app SnackBar (consumed by the UI).
  NotificationModel? pendingAlert;

  /// Bumped when Corrections should reload (claim corrected / appointment updates).
  int correctionsRevision = 0;

  Timer? _pollTimer;
  int? _previousUnread;
  bool _realtimeActive = false;
  bool _localReady = false;
  int _localId = 1000;
  static const _pollInterval = Duration(seconds: 3);

  /// Start near-real-time SSE + short poll for this signed-in user.
  void startRealtime() {
    if (_realtimeActive) {
      unawaited(load(silent: true));
      return;
    }
    _realtimeActive = true;
    unawaited(_ensureLocalNotifications());
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      unawaited(load(silent: true));
    });
    unawaited(load());
    unawaited(_runSseLoop());
  }

  void stopRealtime() {
    _realtimeActive = false;
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _ensureLocalNotifications() async {
    if (_localReady) return;
    try {
      const android = AndroidInitializationSettings('@mipmap/ic_launcher');
      const ios = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
      await _localNotifications.initialize(
        const InitializationSettings(android: android, iOS: ios),
      );
      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
      _localReady = true;
    } catch (_) {
      _localReady = false;
    }
  }

  Future<void> _runSseLoop() async {
    while (_realtimeActive) {
      try {
        await _service.listenStream(
          shouldContinue: () => _realtimeActive,
          onEvent: () {
            unawaited(load(silent: true));
          },
        );
      } catch (_) {
        // Fall back to polling until reconnect.
      }
      if (!_realtimeActive) break;
      await Future<void>.delayed(const Duration(seconds: 2));
    }
  }

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      isLoading = true;
      error = null;
      notifyListeners();
    }
    try {
      final result = await _service.list();
      final previousUnread = _previousUnread;
      final previousIds = {for (final item in items) item.id};

      items = result.items;
      unreadCount = result.unreadCount;
      _previousUnread = unreadCount;

      final rose =
          previousUnread != null && unreadCount > previousUnread;
      if (rose) {
        NotificationModel? newest;
        for (final item in items) {
          if (item.unread && !previousIds.contains(item.id)) {
            newest = item;
            break;
          }
        }
        newest ??= () {
          for (final item in items) {
            if (item.unread) return item;
          }
          return items.isEmpty ? null : items.first;
        }();
        if (newest != null) {
          pendingAlert = newest;
          unawaited(_showSystemNotification(newest));
          if (_affectsCorrections(newest)) {
            correctionsRevision++;
          }
        }
      }
    } on ApiException catch (err) {
      if (!silent) error = err.message;
    } catch (_) {
      if (!silent) error = 'Unable to load notifications.';
    } finally {
      if (!silent) isLoading = false;
      notifyListeners();
    }
  }

  NotificationModel? consumeAlert() {
    final alert = pendingAlert;
    pendingAlert = null;
    return alert;
  }

  void requestCorrectionsRefresh() {
    correctionsRevision++;
    notifyListeners();
  }

  bool _affectsCorrections(NotificationModel item) {
    final type = (item.type ?? '').toLowerCase();
    final href = (item.href ?? '').toLowerCase();
    return type == 'claim_corrected' ||
        type == 'appointment_confirmed' ||
        type == 'appointment_declined' ||
        href.contains('corrections');
  }

  Future<void> _showSystemNotification(NotificationModel item) async {
    if (!_localReady) await _ensureLocalNotifications();
    if (!_localReady) return;
    try {
      const androidDetails = AndroidNotificationDetails(
        'somai_alerts',
        'SomAI alerts',
        channelDescription:
            'Appointment and claim correction notifications',
        importance: Importance.high,
        priority: Priority.high,
      );
      const details = NotificationDetails(
        android: androidDetails,
        iOS: DarwinNotificationDetails(),
      );
      await _localNotifications.show(
        _localId++,
        item.title.isEmpty ? 'SomAI' : item.title,
        item.body,
        details,
      );
    } catch (_) {}
  }

  Future<void> refreshUnread() async {
    try {
      unreadCount = await _service.unreadCount();
      _previousUnread = unreadCount;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markRead(String id) async {
    try {
      final updated = await _service.markRead(id);
      items = items
          .map((item) => item.id == id ? updated.copyWith(unread: false) : item)
          .toList();
      unreadCount = items.where((item) => item.unread).length;
      _previousUnread = unreadCount;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    if (unreadCount == 0) return;
    try {
      await _service.markAllRead();
      items = items.map((item) => item.copyWith(unread: false)).toList();
      unreadCount = 0;
      _previousUnread = 0;
      notifyListeners();
    } catch (_) {}
  }

  void clear() {
    stopRealtime();
    items = [];
    unreadCount = 0;
    error = null;
    isLoading = false;
    _previousUnread = null;
    pendingAlert = null;
    correctionsRevision = 0;
    notifyListeners();
  }

  @override
  void dispose() {
    stopRealtime();
    super.dispose();
  }
}
