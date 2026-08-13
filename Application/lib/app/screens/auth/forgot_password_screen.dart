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
    return AuthScaffold(
      showBack: true,
      footer: AuthFooterPrompt(
        prompt: 'Remember your password? ',
        action: 'Sign In',
        onTap: () => Navigator.of(context).pop(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AuthHeader(
            title: 'Forgot password',
            subtitle: 'Enter your email and we will send a reset link',
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _sending ? null : _submit(),
            decoration: authInputDecoration(
              label: 'Email',
              hint: 'you@example.com',
              prefix: const Icon(
                Iconsax.sms_copy,
                size: 18,
                color: AppColors.placeholder,
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            AuthMessage(text: _error!),
          ],
          if (_success != null) ...[
            const SizedBox(height: 14),
            AuthMessage(text: _success!, isError: false),
          ],
          const SizedBox(height: 20),
          AuthPrimaryButton(
            label: 'Send Reset Link',
            loading: _sending,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
