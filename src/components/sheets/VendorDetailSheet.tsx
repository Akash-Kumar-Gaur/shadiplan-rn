import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Check } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import type {
  BudgetCategory,
  Vendor,
  VendorCategory,
  VendorStatus
} from "../../types/wedding";
import { VENDOR_CATEGORIES } from "../../types/wedding";
import { formatDate, formatINR, shortDate } from "../../lib/format";
import {
  useDeleteVendor,
  useMarkVendorPaid,
  useUpdateVendor
} from "../../hooks/use-vendor-guest-mutations";
import { AppBottomSheet, SheetTextInput, formStyles } from "../AppBottomSheet";
import { AppPressable } from "../AppPressable";
import { SheetPicker } from "../SheetPicker";
import { colors, fonts, radius } from "../../theme/tokens";

type Props = {
  vendor: Vendor | null;
  weddingId: string | undefined;
  budgetCategories: BudgetCategory[];
  onClose: () => void;
};

function parseDueDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const VendorDetailSheet = forwardRef<BottomSheetModal, Props>(function VendorDetailSheet(
  { vendor, weddingId, budgetCategories, onClose },
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
      onDismiss={() => {
        setRemoveConfirmOpen(false);
        onClose();
      }}
    >
      <View style={styles.summaryCard}>
        <View style={styles.stats}>
          <Stat label="Total" value={formatINR(vendor.totalCost)} />
          <Stat label="Paid" value={formatINR(vendor.advancePaid)} />
          <Stat label="Balance" value={formatINR(balance)} />
        </View>
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Name *</Text>
        <SheetTextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="Vendor name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Category</Text>
        <SheetPicker
          selectedValue={category}
          onValueChange={setCategory}
          items={VENDOR_CATEGORIES.map((c) => ({ label: c, value: c }))}
        />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Contact name</Text>
        <SheetTextInput style={formStyles.input} value={contactName} onChangeText={setContactName} />
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Phone</Text>
        <SheetTextInput
          style={formStyles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={formStyles.row2}>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Total cost (₹) *</Text>
          <SheetTextInput
            style={formStyles.input}
            value={totalCost}
            onChangeText={setTotalCost}
            keyboardType="numeric"
          />
        </View>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Advance paid (₹)</Text>
          <SheetTextInput
            style={formStyles.input}
            value={advancePaid}
            onChangeText={setAdvancePaid}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={formStyles.row2}>
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Due date</Text>
          <AppPressable style={formStyles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ paddingTop: 12, color: dueDate ? colors.foreground : colors.textMuted }}>
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
        <View style={[formStyles.field, formStyles.row2col]}>
          <Text style={formStyles.label}>Status</Text>
          <SheetPicker
            selectedValue={status}
            onValueChange={setStatus}
            items={[
              { label: "Pending", value: "Pending" },
              { label: "Confirmed", value: "Confirmed" },
              { label: "Paid", value: "Paid" },
            ]}
          />
        </View>
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Notes</Text>
        <SheetTextInput
          style={formStyles.textarea}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <Text style={styles.sectionTitle}>Payment history</Text>
      <View style={styles.listCard}>
        {vendor.payments.length === 0 ? (
          <Text style={styles.empty}>No payments yet</Text>
        ) : (
          vendor.payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentAmount}>{formatINR(p.amount)}</Text>
                {p.note ? <Text style={styles.paymentNote}>{p.note}</Text> : null}
              </View>
              <Text style={styles.paymentDate}>{formatDate(p.date)}</Text>
            </View>
          ))
        )}
      </View>

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
            <Check size={16} color={colors.primary} />
            <Text style={formStyles.outlineBtnText}>
              {balance <= 0 ? "Fully paid" : `Mark as paid (${formatINR(balance)})`}
            </Text>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
