import '../core/constants/api_constants.dart';

class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String role;
  final String? fullName;
  final String? avatarUrl;

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

  /// Absolute URL for NetworkImage / Image.network.
  String? get resolvedAvatarUrl {
    final value = (avatarUrl ?? '').trim();
    if (value.isEmpty) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    final path = value.startsWith('/') ? value : '/$value';
    return '${ApiConstants.baseUrl}$path';
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? role,
    String? fullName,
    String? avatarUrl,
    bool clearAvatar = false,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      role: role ?? this.role,
      fullName: fullName ?? this.fullName,
      avatarUrl: clearAvatar ? null : (avatarUrl ?? this.avatarUrl),
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final nested = json['user'];
    final source = nested is Map<String, dynamic> ? nested : json;
    final rawAvatar = source['avatar_url'] ?? source['avatar_path'];
    return UserModel(
      id: '${source['id'] ?? ''}',
      email: '${source['email'] ?? ''}',
      role: '${source['role'] ?? 'user'}',
      fullName: source['full_name'] as String? ?? source['name'] as String?,
      avatarUrl: rawAvatar?.toString(),
    );
  }

  /// Settings profile payload may omit id/role — merge onto an existing user.
  UserModel mergeSettingsProfile(Map<String, dynamic> json) {
    final rawAvatar = json['avatar_url'] ?? json['avatar_path'];
    return copyWith(
      email: '${json['email'] ?? email}',
      fullName: json['full_name'] as String? ??
          json['name'] as String? ??
          fullName,
      role: '${json['role'] ?? role}',
      avatarUrl: rawAvatar?.toString() ?? avatarUrl,
    );
  }
}
