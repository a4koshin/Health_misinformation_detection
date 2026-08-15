import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/storage/token_storage.dart';
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
  NotificationService({ApiClient? client, TokenStorage? storage})
    : _client = client ?? ApiClient(),
      _storage = storage ?? TokenStorage();

  final ApiClient _client;
  final TokenStorage _storage;

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

  /// Long-lived SSE connection. Calls [onEvent] on connect and each refresh ping.
  /// Returns when the stream ends or [shouldContinue] becomes false.
  Future<void> listenStream({
    required void Function() onEvent,
    required bool Function() shouldContinue,
  }) async {
    final token = await _storage.read();
    if (token == null || token.isEmpty) return;

    final uri = Uri.parse(
      '${ApiConstants.baseUrl}/api/notifications/stream'
      '?token=${Uri.encodeQueryComponent(token)}',
    );

    final client = http.Client();
    try {
      final request = http.Request('GET', uri)
        ..headers.addAll({
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        });

      final response = await client.send(request);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return;
      }

      var buffer = '';
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        if (!shouldContinue()) break;
        buffer += chunk;
        while (true) {
          final sep = buffer.indexOf('\n\n');
          if (sep < 0) break;
          final block = buffer.substring(0, sep);
          buffer = buffer.substring(sep + 2);
          final hasData = block
              .split('\n')
              .any((line) => line.startsWith('data:'));
          final isConnected = block.contains('event: connected');
          if (hasData || isConnected) {
            onEvent();
          }
        }
      }
    } finally {
      client.close();
    }
  }
}
