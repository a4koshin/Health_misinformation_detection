class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
  });

  final String id;
  final String email;
  final String role;
  final String? fullName;

  bool get isUser => role.toLowerCase() == 'user';

  String get displayName {
    final name = (fullName ?? '').trim();
    if (name.isNotEmpty) return name;
    final local = email.split('@').first;
    return local.isEmpty ? 'User' : local;
  }

  String get firstName {
    final name = (fullName ?? '').trim();
    if (name.isNotEmpty) {
      return name.split(RegExp(r'\s+')).first;
    }
    final local = email.split('@').first;
    return local.isEmpty ? 'there' : local;
  }

  String get initials {
    final parts = displayName.split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return 'U';
    final letters = parts.take(2).map((p) => p[0].toUpperCase()).join();
    return letters;
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final nested = json['user'];
    final source = nested is Map<String, dynamic> ? nested : json;
    return UserModel(
      id: '${source['id'] ?? ''}',
      email: '${source['email'] ?? ''}',
      role: '${source['role'] ?? 'user'}',
      fullName: source['full_name'] as String? ?? source['name'] as String?,
    );
  }
}
