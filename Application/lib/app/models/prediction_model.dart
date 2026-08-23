class PredictionModel {
  const PredictionModel({
    required this.id,
    required this.claim,
    required this.label,
    this.aiLabel,
    this.doctorLabel,
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
  final String? aiLabel;
  final String? doctorLabel;
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

  bool get isCorrection =>
      reviewStatus == 'corrected' ||
      (correctedClaim != null && correctedClaim!.trim().isNotEmpty);

  String get displayLabel {
    if (label == 'Misinformation') return 'Non-Reliable';
    return label.isEmpty ? 'Pending' : label;
  }

  String get aiDisplayLabel {
    final value = (aiLabel ?? '').trim();
    if (value.isEmpty) return isCorrection ? 'Non-Reliable' : displayLabel;
    if (value == 'Misinformation') return 'Non-Reliable';
    return value;
  }

  String get doctorDisplayLabel {
    final value = (doctorLabel ?? '').trim();
    if (value.isEmpty) return isCorrection ? 'Reliable' : '';
    if (value == 'Misinformation') return 'Non-Reliable';
    return value;
  }

  factory PredictionModel.fromJson(Map<String, dynamic> json) {
    final created = json['created_at'] as String?;
    return PredictionModel(
      id: '${json['id'] ?? ''}',
      userId: json['user_id']?.toString(),
      claim:
          '${json['claim_text'] ?? json['input_text'] ?? json['claim'] ?? ''}',
      label: '${json['label'] ?? json['somali_status'] ?? ''}',
      aiLabel: json['ai_label']?.toString(),
      doctorLabel: json['doctor_label']?.toString(),
      createdAt: created == null ? null : DateTime.tryParse(created),
      source: json['source'] as String?,
      reviewStatus: json['review_status'] as String?,
      correctedClaim: json['corrected_claim_text'] as String?,
      advisorId: json['advisor_id']?.toString(),
      advisorName: json['advisor_name'] as String?,
    );
  }
}
