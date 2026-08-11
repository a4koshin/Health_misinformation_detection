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
                      lead: 'Create',
                      accent: 'Account',
                      subtitle: 'Register as a user to check health claims',
                    ),
                    const SizedBox(height: 36),
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      decoration: authInputDecoration(hint: 'Full name'),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: authInputDecoration(hint: 'Email'),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _password,
                      obscureText: _obscure,
                      onSubmitted: (_) => loading ? null : _submit(),
                      decoration: authInputDecoration(
                        hint: 'Password',
                        suffix: IconButton(
                          onPressed: () =>
                              setState(() => _obscure = !_obscure),
                          style: IconButton.styleFrom(
                            minimumSize: const Size(36, 36),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            padding: EdgeInsets.zero,
                          ),
                          icon: Icon(
                            _obscure ? Iconsax.eye : Iconsax.eye_slash,
                            color: AppColors.placeholder,
                            size: 18,
                          ),
                        ),
                      ),
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
                    const SizedBox(height: 28),
                    AuthPrimaryButton(
                      label: 'Sign Up',
                      loading: loading,
                      onPressed: _submit,
                    ),
                  ],
                ),
              ),
            ),
            AuthFooterPrompt(
              prompt: 'Already have an account? ',
              action: 'Sign In',
              onTap: loading ? null : () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}
