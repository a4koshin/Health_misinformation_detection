class PredictionModel {
  const PredictionModel({
    required this.id,
    required this.claim,
    required this.label,
    this.userId,
    this.createdAt,
    this.source,
    this.reviewStatus,
    this.correctedClaim,
    this.advisorId,
    this.advisorName,
  });

  final String id;
  final String claim;
  final String label;
  final String? userId;
  final DateTime? createdAt;
  final String? source;
  final String? reviewStatus;
  final String? correctedClaim;
  final String? advisorId;
  final String? advisorName;

  bool get isReliable {
    final value = label.toLowerCase();
    return value == 'reliable';
  }

  String get displayLabel {
    if (label == 'Misinformation') return 'Non-Reliable';
    return label.isEmpty ? 'Pending' : label;
  }

  factory PredictionModel.fromJson(Map<String, dynamic> json) {
    final created = json['created_at'] as String?;
    return PredictionModel(
      id: '${json['id'] ?? ''}',
      userId: json['user_id']?.toString(),
      claim:
          '${json['claim_text'] ?? json['input_text'] ?? json['claim'] ?? ''}',
      label: '${json['label'] ?? json['somali_status'] ?? ''}',
      createdAt: created == null ? null : DateTime.tryParse(created),
      source: json['source'] as String?,
      reviewStatus: json['review_status'] as String?,
      correctedClaim: json['corrected_claim_text'] as String?,
      advisorId: json['advisor_id']?.toString(),
      advisorName: json['advisor_name'] as String?,
    );
  }
}
