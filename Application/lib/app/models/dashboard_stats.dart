class DashboardStats {
  const DashboardStats({
    required this.totalPredictions,
    required this.reliableCount,
    required this.nonReliableCount,
    required this.chatCount,
  });

  final int totalPredictions;
  final int reliableCount;
  final int nonReliableCount;
  final int chatCount;

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    int read(String key) {
      final value = json[key];
      if (value is int) return value;
      return int.tryParse('${value ?? 0}') ?? 0;
    }

    return DashboardStats(
      totalPredictions: read('total_predictions'),
      reliableCount: read('reliable_count'),
      nonReliableCount: read('non_reliable_count'),
      chatCount: read('chat_count'),
    );
  }
}
