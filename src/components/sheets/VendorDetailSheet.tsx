import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Banknote, Check, Plus } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import type {
  BudgetCategory,
  Vendor,
  VendorCategory,
  VendorStatus
} from "../../types/wedding";
import { VENDOR_CATEGORIES } from "../../types/wedding";
import { formatDate, shortDate } from "../../lib/format";
import { useFormDirty } from "../../hooks/use-form-dirty";
import {
  useDeleteVendor,
  useMarkVendorPaid,
  useUpdateVendor
} from "../../hooks/use-vendor-guest-mutations";
import { AmountText } from "../AmountText";
import { AppBottomSheet, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { AppSelect } from "../AppSelect";
import { AppTextInput } from "../AppTextInput";
import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  vendor: Vendor | null;
  weddingId: string | undefined;
  budgetCategories: BudgetCategory[];
  onClose: () => void;
  onAddPayment?: () => void;
};

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const VendorDetailSheet = forwardRef<BottomSheetModal, Props>(function VendorDetailSheet(
  { vendor, weddingId, budgetCategories, onClose, onAddPayment },
  ref,
) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const updateVendor = useUpdateVendor(weddingId);
  const markPaid = useMarkVendorPaid(weddingId);
  const deleteVendor = useDeleteVendor(weddingId);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("Venue");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [advancePaid, setAdvancePaid] = useState("0");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState<VendorStatus>("Pending");
  const [notes, setNotes] = useState("");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendor) return;
    setName(vendor.name);
    setCategory(vendor.category);
    setContactName(vendor.contactName ?? "");
    setPhone(vendor.phone ?? "");
    setTotalCost(String(vendor.totalCost));
    setAdvancePaid(String(vendor.advancePaid));
    setDueDate(parseDueDate(vendor.dueDate));
    setStatus(vendor.status);
    setNotes(vendor.notes ?? "");
    setRemoveConfirmOpen(false);
    setError(null);
    setShowDatePicker(false);
  }, [vendor]);

  const formValues = useMemo(
    () => ({
      name,
      category,
      contactName,
      phone,
      totalCost,
      advancePaid,
      dueDate,
      status,
      notes,
    }),
    [name, category, contactName, phone, totalCost, advancePaid, dueDate, status, notes],
  );

  const baseline = useMemo(
    () => ({
      name: vendor?.name ?? "",
      category: vendor?.category ?? ("Venue" as VendorCategory),
      contactName: vendor?.contactName ?? "",
      phone: vendor?.phone ?? "",
      totalCost: vendor ? String(vendor.totalCost) : "",
      advancePaid: vendor ? String(vendor.advancePaid) : "0",
      dueDate: vendor ? parseDueDate(vendor.dueDate) : null,
      status: vendor?.status ?? ("Pending" as VendorStatus),
      notes: vendor?.notes ?? "",
    }),
    [vendor],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const balance = vendor ? vendor.totalCost - vendor.advancePaid : 0;

  const handleSave = async () => {
    if (!vendor) return;
    if (!name.trim()) {
      setError("Vendor name is required");
      return;
    }
    const cost = Number(totalCost);
    if (!cost || cost <= 0) {
      setError("Enter a valid total cost");
      return;
    }
    const advance = Number(advancePaid) || 0;
    if (advance < 0 || advance > cost) {
      setError("Advance paid must be between 0 and total cost");
      return;
    }

    setError(null);
    try {
      await updateVendor.mutateAsync({
        vendorId: vendor.id,
        input: {
          name: name.trim(),
          category,
          contactName: contactName.trim(),
          phone: phone.trim(),
          totalCost: cost,
          advancePaid: advance,
          dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : "",
          status,
          notes: notes.trim() || undefined
}
});
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save vendor");
    }
  };

  const handleMarkPaid = async () => {
    if (!vendor || balance <= 0) return;
    try {
      await markPaid.mutateAsync({ vendor, budgetCategories });
      innerRef.current?.dismiss();
      onClose();
    } catch {
      // mutation error surfaces via isError if needed
    }
  };

  const handleRemove = async () => {
    if (!vendor) return;
    try {
      await deleteVendor.mutateAsync(vendor.id);
      innerRef.current?.dismiss();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove vendor");
    }
  };

  if (!vendor) return null;

  const busy = updateVendor.isPending || markPaid.isPending || deleteVendor.isPending;

  return (
    <AppBottomSheet
      ref={innerRef}
      title="Edit vendor"
      subtitle={vendor.category}
      isDirty={isDirty}
      onDismiss={() => {
        setRemoveConfirmOpen(false);
        onClose();
      }}
    >
      <View style={styles.summaryCard}>
        <View style={styles.stats}>
          <Stat label="Total" value={vendor.totalCost} />
          <Stat label="Paid" value={vendor.advancePaid} />
          <Stat label="Balance" value={balance} />
        </View>
        <Text style={styles.runningTotal}>
          Running total:{" "}
          <AmountText value={vendor.advancePaid} style={styles.runningTotalEm} />
          {" of "}
          <AmountText value={vendor.totalCost} style={styles.runningTotalEm} />
        </Text>
        <View style={styles.payProgressTrack}>
          <View
            style={[
              styles.payProgressFill,
              {
                width: `${
                  vendor.totalCost > 0
                    ? Math.min(100, Math.round((vendor.advancePaid / vendor.totalCost) * 100))
                    : 0
                }%`,
              },
            ]}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Payment history</Text>
      <View style={styles.listCard}>
        {vendor.payments.length === 0 ? (
          <Text style={styles.empty}>No payments yet</Text>
        ) : (
          vendor.payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View>
                <AmountText value={p.amount} style={styles.paymentAmount} />
                {p.note ? <Text style={styles.paymentNote}>{p.note}</Text> : null}
              </View>
              <Text style={styles.paymentDate}>{formatDate(p.date)}</Text>
            </View>
          ))
        )}
      </View>

      {onAddPayment ? (
        <AppPressable
          onPress={onAddPayment}
          disabled={busy}
          style={[formStyles.outlineBtn, { marginTop: 0, marginBottom: 16 }]}
        >
          <View style={styles.markPaidRow}>
            <Plus size={16} color={colors.primary} />
            <Text style={formStyles.outlineBtnText}>Add payment</Text>
          </View>
        </AppPressable>
      ) : null}

      <AppTextInput
        label="Name *"
        value={name}
        onChangeText={setName}
        placeholder="Vendor name"
      />

      <AppSelect
        label="Category"
        value={category}
        onSelect={setCategory}
        options={VENDOR_CATEGORIES.map((c) => ({ label: c, value: c }))}
      />

      <AppTextInput
        label="Contact name"
        value={contactName}
        onChangeText={setContactName}
      />

      <AppTextInput
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <View style={formStyles.row2}>
        <AppTextInput
          label="Total cost (₹) *"
          value={totalCost}
          onChangeText={setTotalCost}
          keyboardType="numeric"
          containerStyle={formStyles.row2col}
        />
        <AppTextInput
          label="Advance paid (₹)"
          value={advancePaid}
          onChangeText={setAdvancePaid}
          keyboardType="numeric"
          containerStyle={formStyles.row2col}
        />
      </View>

      <View style={formStyles.row2}>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Due date</Text>
          <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: dueDate ? colors.charcoal : colors.textMuted, fontSize: 15 }}>
              {dueDate ? shortDate(dueDate.toISOString().slice(0, 10)) : "Select date"}
            </Text>
          </AppPressable>
          {showDatePicker ? (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (date) setDueDate(date);
              }}
            />
          ) : null}
        </View>
        <AppSelect
          label="Status"
          value={status}
          onSelect={setStatus}
          containerStyle={formStyles.row2col}
          options={[
            { label: "Pending", value: "Pending" },
            { label: "Confirmed", value: "Confirmed" },
            { label: "Paid", value: "Paid" },
          ]}
        />
      </View>

      <AppTextInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? <Text style={formStyles.error}>{error}</Text> : null}

      <AppPressable
        onPress={handleSave}
        disabled={busy}
        style={[formStyles.primaryBtn, busy && formStyles.primaryBtnDisabled]}
      >
        {updateVendor.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={formStyles.primaryBtnText}>Save changes</Text>
        )}
      </AppPressable>

      <AppPressable
        onPress={handleMarkPaid}
        disabled={busy || balance <= 0}
        style={[
          formStyles.outlineBtn,
          (busy || balance <= 0) && formStyles.primaryBtnDisabled,
        ]}
      >
        {markPaid.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.markPaidRow}>
            {balance <= 0 ? (
              <Check size={16} color={colors.primary} />
            ) : (
              <Banknote size={16} color={colors.primary} />
            )}
            {balance <= 0 ? (
              <Text style={formStyles.outlineBtnText}>Fully paid</Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                <Text style={formStyles.outlineBtnText}>Mark remaining as paid (</Text>
                <AmountText value={balance} style={formStyles.outlineBtnText} />
                <Text style={formStyles.outlineBtnText}>)</Text>
              </View>
            )}
          </View>
        )}
      </AppPressable>

      {removeConfirmOpen ? (
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Remove {vendor.name}?</Text>
          <Text style={styles.confirmBody}>
            Payment history for this vendor will be removed too.
          </Text>
          <View style={styles.confirmActions}>
            <AppPressable
              onPress={() => setRemoveConfirmOpen(false)}
              style={styles.confirmCancelBtn}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </AppPressable>
            <AppPressable
              onPress={handleRemove}
              disabled={deleteVendor.isPending}
              style={styles.confirmRemoveBtn}
            >
              {deleteVendor.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmRemoveText}>Remove</Text>
              )}
            </AppPressable>
          </View>
        </View>
      ) : (
        <AppPressable
          onPress={() => setRemoveConfirmOpen(true)}
          style={{ marginTop: 16, alignItems: "center" }}
        >
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.destructive }}>
            Remove vendor
          </Text>
        </AppPressable>
      )}
    </AppBottomSheet>
  );
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <AmountText value={value} style={styles.statValue} />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16
},
  stats: {
    flexDirection: "row",
    gap: 12
},
  runningTotal: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  runningTotalEm: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  payProgressTrack: {
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  payProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  stat: {
    flex: 1
},
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5
},
  statValue: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.foreground
},
  sectionTitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4
},
  listCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden"
},
  empty: {
    padding: 16,
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground
},
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
},
  paymentAmount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground
},
  paymentNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground
},
  paymentDate: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground
},
  markPaidRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
},
  confirmCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(196,74,58,0.35)",
    backgroundColor: "rgba(196,74,58,0.08)",
    borderRadius: radius.lg,
    padding: 16
},
  confirmTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground
},
  confirmBody: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground
},
  confirmActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8
},
  confirmCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background
},
  confirmCancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground
},
  confirmRemoveBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive
},
  confirmRemoveText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#fff"
}
});
