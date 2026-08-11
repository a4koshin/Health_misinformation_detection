import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/user_validation.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/auth_widgets.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String? _error;
  String? _success;
  bool _sending = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
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
      _sending = true;
    });
    try {
      final message = await context.read<AuthProvider>().forgotPassword(
            _email.text.trim(),
          );
      if (mounted) {
        setState(() {
          _success = message;
          _sending = false;
        });
      }
    } on ApiException catch (err) {
      if (mounted) {
        setState(() {
          _error = err.message;
          _sending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 24, 28, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Iconsax.arrow_left),
                      color: AppColors.ink,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 44,
                        minHeight: 44,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const AuthHeadline(
                      lead: 'Forgot',
                      accent: 'Password',
                      subtitle: 'Enter your email and we will send a reset link',
                    ),
                    const SizedBox(height: 40),
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _sending ? null : _submit(),
                      decoration: authInputDecoration(hint: 'Email'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 11,
                        ),
                      ),
                    ],
                    if (_success != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _success!,
                        style: const TextStyle(
                          color: AppColors.inkMuted,
                          fontSize: 11,
                          height: 1.4,
                        ),
                      ),
                    ],
                    const SizedBox(height: 28),
                    AuthPrimaryButton(
                      label: 'Send Reset Link',
                      loading: _sending,
                      onPressed: _submit,
                    ),
                  ],
                ),
              ),
            ),
            AuthFooterPrompt(
              prompt: 'Remember your password? ',
              action: 'Sign In',
              onTap: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}
