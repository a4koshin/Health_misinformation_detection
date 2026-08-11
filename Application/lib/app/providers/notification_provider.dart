import 'package:flutter/foundation.dart';

import '../core/network/api_exception.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  NotificationProvider({NotificationService? service})
    : _service = service ?? NotificationService();

  final NotificationService _service;

  List<NotificationModel> items = [];
  int unreadCount = 0;
  bool isLoading = false;
  String? error;

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final result = await _service.list();
      items = result.items;
      unreadCount = result.unreadCount;
    } on ApiException catch (err) {
      error = err.message;
    } catch (_) {
      error = 'Unable to load notifications.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshUnread() async {
    try {
      unreadCount = await _service.unreadCount();
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
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    if (unreadCount == 0) return;
    try {
      await _service.markAllRead();
      items = items.map((item) => item.copyWith(unread: false)).toList();
      unreadCount = 0;
      notifyListeners();
    } catch (_) {}
  }

  void clear() {
    items = [];
    unreadCount = 0;
    error = null;
    isLoading = false;
    notifyListeners();
  }
}
