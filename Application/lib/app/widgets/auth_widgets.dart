import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

InputDecoration authInputDecoration({
  required String hint,
  Widget? suffix,
}) {
  return InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(
      color: Color(0xFFB0B0B0),
      fontSize: 12,
      fontWeight: FontWeight.w400,
    ),
    filled: true,
    fillColor: AppColors.fieldFill,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    suffixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 36),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.brandLight),
    ),
    suffixIcon: suffix,
  );
}

class AuthHeadline extends StatelessWidget {
  const AuthHeadline({
    super.key,
    required this.lead,
    required this.accent,
    required this.subtitle,
  });

  final String lead;
  final String accent;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: '$lead ',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: AppColors.ink,
                ),
              ),
              TextSpan(
                text: accent,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: AppColors.brand,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          subtitle,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            height: 1.45,
            color: AppColors.ink,
          ),
        ),
      ],
    );
  }
}

class AuthPrimaryButton extends StatelessWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 44,
      child: FilledButton(
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brand,
          disabledBackgroundColor: AppColors.brandLight,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        child: Text(loading ? 'Please wait...' : label),
      ),
    );
  }
}

class AuthFooterPrompt extends StatelessWidget {
  const AuthFooterPrompt({
    super.key,
    required this.prompt,
    required this.action,
    required this.onTap,
  });

  final String prompt;
  final String action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, top: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            prompt,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.ink,
              fontWeight: FontWeight.w500,
            ),
          ),
          GestureDetector(
            onTap: onTap,
            child: Text(
              action,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.brand,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
