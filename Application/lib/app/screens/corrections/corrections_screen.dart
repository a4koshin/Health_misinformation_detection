import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/format.dart';
import '../../models/appointment_model.dart';
import '../../models/prediction_model.dart';
import '../../services/appointment_service.dart';
import '../../services/history_service.dart';
import '../../widgets/empty_placeholder.dart';
import '../../widgets/page_header.dart';

class CorrectionsScreen extends StatefulWidget {
  const CorrectionsScreen({super.key});

  @override
  State<CorrectionsScreen> createState() => _CorrectionsScreenState();
}

class _CorrectionsScreenState extends State<CorrectionsScreen> {
  final HistoryService _historyService = HistoryService();
  final AppointmentService _appointmentService = AppointmentService();

  bool _isLoading = true;
  String? _error;
  List<PredictionModel> _items = const [];
  Map<String, AppointmentModel> _appointments = const {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _historyService.listHistory(perPage: 50),
        _appointmentService.listMine(),
      ]);
      if (!mounted) return;
      final items = (results[0] as List<PredictionModel>)
          .where(_isCorrection)
          .toList();
      final booked = results[1] as List<AppointmentModel>;
      final map = <String, AppointmentModel>{};
      for (final row in booked) {
        final current = map[row.predictionId];
        if (current == null) {
          map[row.predictionId] = row;
        }
      }
      setState(() {
        _items = items;
        _appointments = map;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error';
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  bool _isCorrection(PredictionModel item) {
    return item.reviewStatus == 'corrected' &&
        (item.correctedClaim ?? '').trim().isNotEmpty;
  }

  Future<void> _book(PredictionModel item) async {
    final doctorId = item.advisorId;
    if (doctorId == null || doctorId.isEmpty) return;
    final result = await showModalBottomSheet<_BookingResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _BookAppointmentDialog(
        doctorName: item.advisorName?.trim().isNotEmpty == true
            ? item.advisorName!
            : 'this doctor',
        correctedClaim: (item.correctedClaim ?? '').trim(),
        loadSlots: () => _appointmentService.listAvailability(doctorId),
      ),
    );
    if (result == null || !mounted) return;

    try {
      final created = await _appointmentService.book(
        predictionId: item.id,
        availabilityId: result.availabilityId,
        note: result.note,
      );
      if (!mounted) return;
      setState(() {
        _appointments = {..._appointments, item.id: created};
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiException
          ? error.message
          : 'Unable to book this appointment.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.brand,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const PageHeader(
            title: 'Corrections',
            description:
                'Sentences a doctor rewrote for you. Book an appointment if you need more information.',
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _buildBody(),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(
          child: CircularProgressIndicator(
            color: AppColors.brand,
            strokeWidth: 2,
          ),
        ),
      );
    }

    if (_error != null) {
      return EmptyPlaceholder(
        icon: Iconsax.warning_2_copy,
        title: 'Could not load corrections',
        description: _error!,
      );
    }

    if (_items.isEmpty) {
      return const EmptyPlaceholder(
        icon: Iconsax.message_edit_copy,
        title: 'No corrections yet',
        description:
            'When a doctor corrects a Non-Reliable claim, it will appear here.',
      );
    }

    return Column(
      children: [
        for (final item in _items)
          _CorrectionRow(
            item: item,
            appointment: _appointments[item.id],
            onBook: () => _book(item),
          ),
      ],
    );
  }
}

class _CorrectionRow extends StatelessWidget {
  const _CorrectionRow({
    required this.item,
    required this.onBook,
    this.appointment,
  });

  final PredictionModel item;
  final AppointmentModel? appointment;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    final doctorName = item.advisorName?.trim().isNotEmpty == true
        ? item.advisorName!
        : 'Doctor';
    final status = appointment?.status;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Iconsax.message_edit_copy,
                  size: 18,
                  color: AppColors.brand,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Previous claim',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.placeholder,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.claim,
                      style: const TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                        color: AppColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.brandSoft.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Corrected sentence',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.brandDeep,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  (item.correctedClaim ?? '').trim(),
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.45,
                    color: AppColors.ink,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Corrected by $doctorName · ${formatDateTime(item.createdAt)}',
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.placeholder,
            ),
          ),
          const SizedBox(height: 12),
          if (status == 'pending')
            _StatusChip(
              label: appointment?.startsAt == null
                  ? 'Appointment requested'
                  : 'Requested · ${formatSlotRange(appointment?.startsAt, appointment?.endsAt)}',
              pending: true,
            )
          else if (status == 'confirmed')
            _StatusChip(
              label: appointment?.startsAt == null
                  ? 'Appointment confirmed'
                  : 'Confirmed · ${formatSlotRange(appointment?.startsAt, appointment?.endsAt)}',
              pending: false,
            )
          else
            SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton.icon(
                onPressed: item.advisorId == null || item.advisorId!.isEmpty
                    ? null
                    : onBook,
                icon: const Icon(Iconsax.clock_copy, size: 16),
                label: const Text('Book appointment'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.brand,
                  foregroundColor: Colors.white,
                  textStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.pending});

  final String label;
  final bool pending;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: pending ? AppColors.brandSoft : const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: pending ? AppColors.brandDeep : const Color(0xFF047857),
        ),
      ),
    );
  }
}

class _BookingResult {
  const _BookingResult({required this.availabilityId, required this.note});

  final String availabilityId;
  final String note;
}

class _BookAppointmentDialog extends StatefulWidget {
  const _BookAppointmentDialog({
    required this.doctorName,
    required this.correctedClaim,
    required this.loadSlots,
  });

  final String doctorName;
  final String correctedClaim;
  final Future<List<AvailabilitySlot>> Function() loadSlots;

  @override
  State<_BookAppointmentDialog> createState() => _BookAppointmentDialogState();
}

class _BookAppointmentDialogState extends State<_BookAppointmentDialog> {
  final TextEditingController _note = TextEditingController();
  List<AvailabilitySlot> _slots = const [];
  String? _selectedId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final slots = await widget.loadSlots();
      if (!mounted) return;
      setState(() {
        _slots = slots;
        _selectedId = slots.isEmpty ? null : slots.first.id;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is ApiException
            ? error.message
            : 'Unable to load available times.';
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    final maxHeight = MediaQuery.sizeOf(context).height * 0.58;
    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 32,
                  height: 3,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Book an appointment',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, size: 18),
                  ),
                ],
              ),
              Text(
                'Choose one of ${widget.doctorName}\'s available times.',
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.35,
                  color: AppColors.inkMuted,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  widget.correctedClaim,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.35,
                    color: AppColors.ink,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: CircularProgressIndicator(
                      color: AppColors.brand,
                      strokeWidth: 2,
                    ),
                  ),
                )
              else if (_error != null)
                Text(
                  _error!,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.danger,
                  ),
                )
              else if (_slots.isEmpty)
                const Text(
                  'This doctor has not published any open times yet.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.inkMuted,
                  ),
                )
              else
                _SlotPicker(
                  slots: _slots,
                  selectedId: _selectedId,
                  onSelected: (id) => setState(() => _selectedId = id),
                ),
              const SizedBox(height: 8),
              TextField(
                controller: _note,
                maxLines: 2,
                maxLength: 800,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'What would you like to know? (optional)',
                  hintStyle: const TextStyle(
                    fontSize: 12,
                    color: AppColors.placeholder,
                  ),
                  filled: true,
                  fillColor: AppColors.surface,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 10,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.brand),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SafeArea(
                top: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FilledButton(
                      onPressed: _selectedId == null
                          ? null
                          : () => Navigator.of(context).pop(
                                _BookingResult(
                                  availabilityId: _selectedId!,
                                  note: _note.text,
                                ),
                              ),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.brand,
                        minimumSize: const Size.fromHeight(40),
                      ),
                      child: const Text('Book time'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        minimumSize: const Size.fromHeight(32),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(color: AppColors.inkMuted),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SlotPicker extends StatelessWidget {
  const _SlotPicker({
    required this.slots,
    required this.selectedId,
    required this.onSelected,
  });

  final List<AvailabilitySlot> slots;
  final String? selectedId;
  final ValueChanged<String> onSelected;

  DateTime _dayOf(AvailabilitySlot slot) => slotDay(slot.startsAt);

  @override
  Widget build(BuildContext context) {
    final days = <DateTime>[];
    for (final slot in slots) {
      final day = _dayOf(slot);
      if (days.every((item) => item != day)) days.add(day);
    }
    final selected = slots.where((slot) => slot.id == selectedId);
    final selectedDay = _dayOf(
      selected.isEmpty ? slots.first : selected.first,
    );
    final times = slots.where((slot) => _dayOf(slot) == selectedDay).toList();

    void selectDay(DateTime day) {
      final dayTimes = slots.where((slot) => _dayOf(slot) == day);
      if (dayTimes.isEmpty) return;
      onSelected(dayTimes.first.id);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Date',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final day in days)
              _DateChip(
                day: day,
                selected: day == selectedDay,
                onTap: () => selectDay(day),
              ),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          'Time · ${formatSlotDate(selectedDay)}',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 6),
        for (final slot in times)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: _SlotCard(
              slot: slot,
              selected: slot.id == selectedId,
              onTap: () => onSelected(slot.id),
            ),
          ),
      ],
    );
  }
}

class _DateChip extends StatelessWidget {
  const _DateChip({
    required this.day,
    required this.selected,
    required this.onTap,
  });

  final DateTime day;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.brand : Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 54,
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.brand : AppColors.border,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                formatSlotWeekday(day),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : AppColors.placeholder,
                ),
              ),
              Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  height: 1.15,
                  color: selected ? Colors.white : AppColors.ink,
                ),
              ),
              Text(
                formatSlotMonth(day),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: selected
                      ? Colors.white.withValues(alpha: 0.9)
                      : AppColors.inkMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SlotCard extends StatelessWidget {
  const _SlotCard({
    required this.slot,
    required this.selected,
    required this.onTap,
  });

  final AvailabilitySlot slot;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.brandSoft : Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.brand : AppColors.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: selected ? Colors.white : AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Iconsax.clock_copy,
                  size: 14,
                  color: selected ? AppColors.brand : AppColors.brandDeep,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${formatSlotTime(slot.startsAt)} – ${formatSlotTime(slot.endsAt)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.ink,
                      ),
                    ),
                    Text(
                      formatSlotDuration(slot.startsAt, slot.endsAt),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.placeholder,
                      ),
                    ),
                  ],
                ),
              ),
              selected
                  ? const Icon(
                      Iconsax.tick_circle_copy,
                      size: 18,
                      color: AppColors.brand,
                    )
                  : Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border, width: 1.5),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
