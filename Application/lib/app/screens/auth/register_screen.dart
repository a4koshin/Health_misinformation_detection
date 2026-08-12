import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/user_validation.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/auth_widgets.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final nameError = validateFullName(_name.text);
    if (nameError != null) {
      setState(() => _error = nameError);
      return;
    }
    final emailError = validateEmailAddress(_email.text);
    if (emailError != null) {
      setState(() => _error = emailError);
      return;
    }
    if (_password.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters.');
      return;
    }

    setState(() => _error = null);
    try {
      await context.read<AuthProvider>().register(
            fullName: _name.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
          );
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (err) {
      if (mounted) setState(() => _error = err.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthProvider>().isLoading;

    return AuthScaffold(
      showBack: true,
      footer: AuthFooterPrompt(
        prompt: 'Already have an account? ',
        action: 'Sign In',
        onTap: loading ? null : () => Navigator.of(context).pop(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AuthHeader(
            title: 'Create account',
            subtitle: 'Sign up to check Somali health claims',
          ),
          const SizedBox(height: 28),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            decoration: authInputDecoration(
              label: 'Full name',
              hint: 'Your full name',
              prefix: const Icon(
                Iconsax.user,
                size: 18,
                color: AppColors.placeholder,
              ),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: authInputDecoration(
              label: 'Email',
              hint: 'you@example.com',
              prefix: const Icon(
                Iconsax.sms,
                size: 18,
                color: AppColors.placeholder,
              ),
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _password,
            obscureText: _obscure,
            onSubmitted: (_) => loading ? null : _submit(),
            decoration: authInputDecoration(
              label: 'Password',
              hint: 'At least 8 characters',
              prefix: const Icon(
                Iconsax.lock,
                size: 18,
                color: AppColors.placeholder,
              ),
              suffix: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(
                  _obscure ? Iconsax.eye : Iconsax.eye_slash,
                  color: AppColors.placeholder,
                  size: 18,
                ),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            AuthMessage(text: _error!),
          ],
          const SizedBox(height: 20),
          AuthPrimaryButton(
            label: 'Sign Up',
            loading: loading,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
