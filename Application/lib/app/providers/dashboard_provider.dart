import 'package:flutter/foundation.dart';

import '../core/network/api_exception.dart';
import '../models/dashboard_stats.dart';
import '../models/prediction_model.dart';
import '../services/history_service.dart';

class DashboardProvider extends ChangeNotifier {
  DashboardProvider({HistoryService? service})
      : _service = service ?? HistoryService();

  final HistoryService _service;

  DashboardStats? stats;
  List<PredictionModel> recent = [];
  bool isLoading = false;
  String? error;

  Future<void> load({String? userId}) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _service.getStats(),
        _service.listHistory(perPage: 20),
      ]);
      stats = results[0] as DashboardStats;
      var rows = results[1] as List<PredictionModel>;
      if (userId != null && userId.isNotEmpty) {
        rows = rows
            .where((row) => row.userId == null || row.userId == userId)
            .toList();
      }
      recent = rows;
    } on ApiException catch (err) {
      error = err.message;
    } catch (_) {
      error = 'Unable to load your dashboard.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
