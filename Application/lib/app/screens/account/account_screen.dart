import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/user_validation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../auth/forgot_password_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();

  bool _editing = false;
  String? _error;
  String? _success;
  String? _pendingAvatarPath;
  List<int>? _pendingAvatarBytes;
  String? _pendingAvatarName;
  String? _localPreviewPath;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  void _startEditing() {
    final user = context.read<AuthProvider>().user;
    setState(() {
      _editing = true;
      _error = null;
      _success = null;
      _name.text = user?.fullName?.trim().isNotEmpty == true
          ? user!.fullName!.trim()
          : (user?.displayName ?? '');
      _email.text = user?.email ?? '';
      _pendingAvatarPath = null;
      _pendingAvatarBytes = null;
      _pendingAvatarName = null;
      _localPreviewPath = null;
    });
  }

  void _cancelEditing() {
    setState(() {
      _editing = false;
      _error = null;
      _success = null;
      _pendingAvatarPath = null;
      _pendingAvatarBytes = null;
      _pendingAvatarName = null;
      _localPreviewPath = null;
    });
  }

  Future<void> _pickAvatar() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      withData: true,
    );
    if (picked == null || picked.files.isEmpty) return;

    final file = picked.files.single;
    final size = file.size;
    if (size > 2 * 1024 * 1024) {
      setState(() => _error = 'Avatar must be 2MB or smaller.');
      return;
    }

    setState(() {
      _error = null;
      _pendingAvatarPath = file.path;
      _pendingAvatarBytes = file.bytes;
      _pendingAvatarName = file.name;
      _localPreviewPath = file.path;
    });
  }

  Future<void> _save() async {
    final nameError = validateFullName(_name.text);
    if (nameError != null) {
      setState(() {
        _error = nameError;
        _success = null;
      });
      return;
    }
    final emailError = validateEmailAddress(_email.text);
    if (emailError != null) {
      setState(() {
        _error = emailError;
        _success = null;
      });
      return;
    }

    setState(() {
      _error = null;
      _success = null;
    });

    try {
      await context.read<AuthProvider>().updateProfile(
            name: _name.text.trim(),
            email: _email.text.trim(),
            avatarPath: _pendingAvatarPath,
            avatarBytes: _pendingAvatarBytes,
            avatarFilename: _pendingAvatarName,
          );
      if (!mounted) return;
      setState(() {
        _editing = false;
        _pendingAvatarPath = null;
        _pendingAvatarBytes = null;
        _pendingAvatarName = null;
        _localPreviewPath = null;
        _success = 'Profile updated.';
      });
    } on ApiException catch (err) {
      if (!mounted) return;
      setState(() => _error = err.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final displayName = user?.displayName ?? 'User';
    final email = user?.email ?? '';
    final role = user?.role == 'user' ? 'User' : (user?.role ?? 'User');
    final saving = auth.isSavingProfile;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        const SizedBox(height: 8),
        Center(
          child: Stack(
            children: [
              _AvatarView(
                initials: user?.initials ?? 'U',
                networkUrl: user?.resolvedAvatarUrl,
                localPath: _localPreviewPath,
              ),
              if (_editing)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Material(
                    color: AppColors.brand,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: saving ? null : _pickAvatar,
                      child: const SizedBox(
                        width: 34,
                        height: 34,
                        child: Icon(
                          Iconsax.camera_copy,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (!_editing) ...[
          Text(
            displayName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            email,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.inkMuted,
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 14),
          _Banner(text: _error!, isError: true),
        ],
        if (_success != null && !_editing) ...[
          const SizedBox(height: 14),
          _Banner(text: _success!, isError: false),
        ],
        const SizedBox(height: 24),
        Row(
          children: [
            const Expanded(child: _GroupLabel('Account')),
            if (!_editing)
              TextButton(
                onPressed: _startEditing,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.brand,
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Edit',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (_editing)
          _SettingsGroup(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                child: TextField(
                  controller: _name,
                  enabled: !saving,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Full name',
                    isDense: true,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
                child: TextField(
                  controller: _email,
                  enabled: !saving,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    isDense: true,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: saving ? null : _cancelEditing,
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        onPressed: saving ? null : _save,
                        child: saving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Save'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          )
        else
          _SettingsGroup(
            children: [
              _InfoTile(
                icon: Iconsax.user_copy,
                label: 'Name',
                value: displayName,
              ),
              _InfoTile(
                icon: Iconsax.sms_copy,
                label: 'Email',
                value: email,
              ),
              _InfoTile(
                icon: Iconsax.shield_tick_copy,
                label: 'Role',
                value: role,
                showDivider: false,
              ),
            ],
          ),
        const SizedBox(height: 20),
        const _GroupLabel('Security'),
        const SizedBox(height: 8),
        _SettingsGroup(
          children: [
            _NavTile(
              icon: Iconsax.lock_copy,
              title: 'Reset password',
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const ForgotPasswordScreen(),
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 20),
        _SettingsGroup(
          children: [
            _NavTile(
              icon: Iconsax.logout_copy,
              title: 'Sign out',
              titleColor: AppColors.danger,
              iconColor: AppColors.danger,
              showChevron: false,
              onTap: () {
                context.read<NotificationProvider>().clear();
                context.read<AuthProvider>().logout();
              },
            ),
          ],
        ),
      ],
    );
  }
}

class _AvatarView extends StatelessWidget {
  const _AvatarView({
    required this.initials,
    this.networkUrl,
    this.localPath,
  });

  final String initials;
  final String? networkUrl;
  final String? localPath;

  @override
  Widget build(BuildContext context) {
    Widget fallback = Container(
      width: 88,
      height: 88,
      color: AppColors.brandSoft,
      alignment: Alignment.center,
      child: Text(
        initials,
        style: const TextStyle(
          color: AppColors.brand,
          fontWeight: FontWeight.w600,
          fontSize: 20,
        ),
      ),
    );

    Widget child = fallback;
    if (localPath != null && localPath!.isNotEmpty) {
      child = Image.file(
        File(localPath!),
        width: 88,
        height: 88,
        fit: BoxFit.cover,
        errorBuilder: (_, error, stackTrace) => fallback,
      );
    } else if (networkUrl != null && networkUrl!.isNotEmpty) {
      child = Image.network(
        networkUrl!,
        width: 88,
        height: 88,
        fit: BoxFit.cover,
        errorBuilder: (_, error, stackTrace) => fallback,
      );
    }

    return ClipOval(child: child);
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.isError});

  final String text;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFFFEF2F2) : const Color(0xFFEAFAF3),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          height: 1.4,
          color: isError ? AppColors.danger : const Color(0xFF059669),
        ),
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  const _GroupLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
          color: AppColors.placeholder,
        ),
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.showDivider = true,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Icon(icon, size: 18, color: AppColors.brand),
              const SizedBox(width: 12),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  value,
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.inkMuted,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (showDivider)
          const Divider(height: 1, indent: 44, color: AppColors.border),
      ],
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.titleColor = AppColors.ink,
    this.iconColor = AppColors.brand,
    this.showChevron = true,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color titleColor;
  final Color iconColor;
  final bool showChevron;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 18, color: iconColor),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: titleColor,
                ),
              ),
            ),
            if (showChevron)
              const Icon(
                Iconsax.arrow_right_1_copy,
                size: 20,
                color: AppColors.placeholder,
              ),
          ],
        ),
      ),
    );
  }
}
