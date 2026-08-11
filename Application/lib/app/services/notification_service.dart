import '../core/network/api_client.dart';
import '../models/notification_model.dart';

class NotificationListResult {
  const NotificationListResult({
    required this.items,
    required this.unreadCount,
  });

  final List<NotificationModel> items;
  final int unreadCount;
}

class NotificationService {
  NotificationService({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<NotificationListResult> list({int limit = 40}) async {
    final data = await _client.get(
      '/api/notifications?limit=$limit',
      auth: true,
    );
    final raw = data['items'];
    final items = raw is List
        ? raw
            .whereType<Map>()
            .map(
              (item) =>
                  NotificationModel.fromJson(Map<String, dynamic>.from(item)),
            )
            .toList()
        : <NotificationModel>[];
    final unread = data['unread_count'];
    return NotificationListResult(
      items: items,
      unreadCount: unread is int
          ? unread
          : items.where((item) => item.unread).length,
    );
  }

  Future<int> unreadCount() async {
    final data = await _client.get(
      '/api/notifications/unread-count',
      auth: true,
    );
    final unread = data['unread_count'];
    return unread is int ? unread : 0;
  }

  Future<NotificationModel> markRead(String id) async {
    final data = await _client.post(
      '/api/notifications/$id/read',
      auth: true,
    );
    return NotificationModel.fromJson(data);
  }

  Future<void> markAllRead() async {
    await _client.post('/api/notifications/read-all', auth: true);
  }
}
