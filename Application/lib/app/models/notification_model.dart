class NotificationModel {
  const NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.unread,
    this.type,
    this.href,
    this.createdAt,
    this.claimExcerpt,
    this.correctedExcerpt,
  });

  final String id;
  final String title;
  final String body;
  final bool unread;
  final String? type;
  final String? href;
  final DateTime? createdAt;
  final String? claimExcerpt;
  final String? correctedExcerpt;

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    final created = json['created_at'] as String?;
    return NotificationModel(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      body: '${json['body'] ?? ''}',
      unread: json['unread'] == true || json['read_at'] == null,
      type: json['type'] as String?,
      href: json['href'] as String?,
      createdAt: created == null ? null : DateTime.tryParse(created),
      claimExcerpt: json['claim_excerpt'] as String?,
      correctedExcerpt: json['corrected_excerpt'] as String?,
    );
  }

  NotificationModel copyWith({bool? unread}) {
    return NotificationModel(
      id: id,
      title: title,
      body: body,
      unread: unread ?? this.unread,
      type: type,
      href: href,
      createdAt: createdAt,
      claimExcerpt: claimExcerpt,
      correctedExcerpt: correctedExcerpt,
    );
  }
}
