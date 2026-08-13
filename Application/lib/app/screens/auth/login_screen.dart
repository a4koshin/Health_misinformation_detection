import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/auth_widgets.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final password = _password.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter your email and password.');
      return;
    }

    setState(() => _error = null);
    try {
      await context.read<AuthProvider>().login(email, password);
    } on ApiException catch (err) {
      if (mounted) setState(() => _error = err.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthProvider>().isLoading;

    return AuthScaffold(
      footer: AuthFooterPrompt(
        prompt: "Don't have an account? ",
        action: 'Sign Up',
        onTap: loading
            ? null
            : () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const RegisterScreen()),
                );
              },
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AuthHeader(
            title: 'Sign in',
            subtitle: 'Welcome back to SomAI',
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            textInputAction: TextInputAction.next,
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
          const SizedBox(height: 14),
          TextField(
            controller: _password,
            obscureText: _obscure,
            autofillHints: const [AutofillHints.password],
            onSubmitted: (_) => loading ? null : _submit(),
            decoration: authInputDecoration(
              label: 'Password',
              hint: 'Enter your password',
              prefix: const Icon(
                Iconsax.lock_copy,
                size: 18,
                color: AppColors.placeholder,
              ),
              suffix: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(
                  _obscure ? Iconsax.eye_copy : Iconsax.eye_slash_copy,
                  color: AppColors.placeholder,
                  size: 18,
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: loading
                  ? null
                  : () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const ForgotPasswordScreen(),
                        ),
                      );
                    },
              style: TextButton.styleFrom(
                foregroundColor: AppColors.brand,
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
              child: const Text(
                'Forgot password?',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          if (_error != null) ...[
            AuthMessage(text: _error!),
            const SizedBox(height: 14),
          ],
          AuthPrimaryButton(
            label: 'Sign In',
            loading: loading,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
