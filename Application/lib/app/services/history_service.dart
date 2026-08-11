import '../core/network/api_client.dart';
import '../models/dashboard_stats.dart';
import '../models/prediction_model.dart';

class HistoryService {
  HistoryService({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<DashboardStats> getStats() async {
    final data = await _client.get('/api/history/stats', auth: true);
    return DashboardStats.fromJson(data);
  }

  Future<List<PredictionModel>> listHistory({int perPage = 20}) async {
    final data = await _client.get(
      '/api/history?per_page=$perPage',
      auth: true,
    );
    final items = data['items'];
    if (items is! List) return [];
    return items
        .whereType<Map>()
        .map((item) => PredictionModel.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }
}
