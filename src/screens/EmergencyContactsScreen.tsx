import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Trash2 } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBottomSheet, formStyles } from "../components/AppBottomSheet";
import { AppPressable } from "../components/AppPressable";
import { requestAppConfirm } from "../components/ConfirmSheet";
import { AppTextInput } from "../components/AppTextInput";
import { Fab } from "../components/Fab";
import { ScreenEmpty } from "../components/ScreenEmpty";
import { ScreenLoader } from "../components/ScreenLoader";
import { StackScreenHeader } from "../components/StackScreenHeader";
import { useFormDirty } from "../hooks/use-form-dirty";
import { useVendors } from "../hooks/use-vendor-guest-queries";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import {
  deleteEmergencyContact,
  fetchEmergencyContacts,
  insertEmergencyContact,
  updateEmergencyContact,
  type EmergencyContact
} from "../lib/emergency-contacts-api";
import { weddingQueryKeys } from "../lib/wedding-query-keys";
import { colors, fonts, spacing } from "../theme/tokens";

function dial(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return;
  void Linking.openURL(`tel:${cleaned}`);
}

export function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: wedding, isLoading: weddingLoading } = useWeddingMeta();
  const weddingId = wedding?.id;
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors(weddingId);
  const addRef = useRef<BottomSheetModal>(null);
  const editRef = useRef<BottomSheetModal>(null);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const contactsQuery = useQuery({
    queryKey: weddingQueryKeys.emergencyContacts(weddingId ?? ""),
    queryFn: () => fetchEmergencyContacts(weddingId!),
    enabled: !!weddingId
});

  const vendorsWithPhone = useMemo(
    () => vendors.filter((v) => v.phone?.trim()),
    [vendors],
  );

  const invalidate = () => {
    if (!weddingId) return;
    void queryClient.invalidateQueries({
      queryKey: weddingQueryKeys.emergencyContacts(weddingId)
});
  };

  const deleteMutation = useMutation({
    mutationFn: deleteEmergencyContact,
    onSuccess: invalidate
});

  const openEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    requestAnimationFrame(() => editRef.current?.present());
  };

  const loading = weddingLoading || vendorsLoading || (!!weddingId && contactsQuery.isPending);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenLoader />
      </View>
    );
  }

  if (!wedding) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenEmpty description="Set up your wedding first." />
      </View>
    );
  }

  const custom = contactsQuery.data ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StackScreenHeader title="Emergency Contacts" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.screen, paddingBottom: insets.bottom + 88 }}
      >
        <Text style={styles.section}>Vendors</Text>
        {vendorsWithPhone.length === 0 ? (
          <Text style={styles.empty}>No vendor phone numbers yet.</Text>
        ) : (
          vendorsWithPhone.map((v) => (
            <AppPressable key={v.id} onPress={() => dial(v.phone)} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{v.name}</Text>
                <Text style={styles.meta}>
                  {v.category}
                  {v.contactName ? ` · ${v.contactName}` : ""}
                </Text>
                <Text style={styles.phone}>{v.phone}</Text>
              </View>
              <Phone size={18} color={colors.primary} />
            </AppPressable>
          ))
        )}

        <Text style={[styles.section, { marginTop: 24 }]}>Other contacts</Text>
        {custom.length === 0 ? (
          <Text style={styles.empty}>Add family coordinators, hospital, etc.</Text>
        ) : (
          custom.map((c) => (
            <View key={c.id} style={styles.row}>
              <AppPressable
                onPress={() => openEdit(c)}
                style={styles.rowPress}
                accessibilityLabel={`Edit ${c.name}`}
              >
                <View style={styles.rowText}>
                  <Text style={styles.name}>{c.name}</Text>
                  {c.role ? <Text style={styles.meta}>{c.role}</Text> : null}
                  <Text style={styles.phone}>{c.phone}</Text>
                </View>
              </AppPressable>
              <AppPressable
                onPress={() => dial(c.phone)}
                style={styles.callBtn}
                accessibilityLabel={`Call ${c.name}`}
              >
                <Phone size={18} color={colors.primary} />
              </AppPressable>
              <AppPressable
                onPress={() =>
                  requestAppConfirm({
                    title: "Delete contact?",
                    message: c.name,
                    confirmLabel: "Delete",
                    destructive: true,
                    onConfirm: () => deleteMutation.mutate(c.id),
                  })
                }
                style={styles.deleteBtn}
                accessibilityLabel="Delete contact"
              >
                <Trash2 size={16} color={colors.destructive} />
              </AppPressable>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="Add contact" aboveTabBar={false} onPress={() => addRef.current?.present()} />
      <ContactFormSheet ref={addRef} weddingId={weddingId!} onSaved={invalidate} />
      <ContactFormSheet
        ref={editRef}
        weddingId={weddingId!}
        contact={editingContact}
        onSaved={invalidate}
        onDismiss={() => setEditingContact(null)}
      />
    </View>
  );
}

const ContactFormSheet = forwardRef<
  BottomSheetModal,
  {
    weddingId: string;
    contact?: EmergencyContact | null;
    onSaved: () => void;
    onDismiss?: () => void;
  }
>(function ContactFormSheet({ weddingId, contact = null, onSaved, onDismiss }, ref) {
  const innerRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => innerRef.current!);
  const isEdit = !!contact;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setRole(contact.role ?? "");
      setNotes(contact.notes ?? "");
    } else {
      setName("");
      setPhone("");
      setRole("");
      setNotes("");
    }
    setError(null);
  }, [contact]);

  const reset = () => {
    if (!contact) {
      setName("");
      setPhone("");
      setRole("");
      setNotes("");
    }
    setError(null);
  };

  const formValues = useMemo(
    () => ({ name, phone, role, notes }),
    [name, phone, role, notes],
  );

  const baseline = useMemo(
    () => ({
      name: contact?.name ?? "",
      phone: contact?.phone ?? "",
      role: contact?.role ?? "",
      notes: contact?.notes ?? "",
    }),
    [contact],
  );

  const isDirty = useFormDirty(formValues, baseline);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit && contact) {
        await updateEmergencyContact(contact.id, {
          name: name.trim(),
          phone: phone.trim(),
          role: role.trim() || undefined,
          notes: notes.trim() || undefined
});
      } else {
        await insertEmergencyContact(weddingId, {
          name: name.trim(),
          phone: phone.trim(),
          role: role.trim() || undefined,
          notes: notes.trim() || undefined
});
      }
      reset();
      innerRef.current?.dismiss();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBottomSheet
      ref={innerRef}
      title={isEdit ? "Edit contact" : "Add contact"}
      isDirty={isDirty}
      onDismiss={onDismiss}
    >
      <AppTextInput
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Nearest hospital"
      />
      <AppTextInput
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+91 …"
      />
      <AppTextInput
        label="Role"
        value={role}
        onChangeText={setRole}
        placeholder="Optional"
      />
      <AppTextInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Optional"
      />
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <AppPressable
        onPress={() => void handleSubmit()}
        disabled={saving}
        style={[formStyles.primaryBtn, saving && formStyles.primaryBtnDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={formStyles.primaryBtnText}>{isEdit ? "Save changes" : "Save"}</Text>
        )}
      </AppPressable>
    </AppBottomSheet>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: 8
},
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 8
},
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
},
  rowPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
},
  rowText: { flex: 1 },
  name: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.foreground },
  meta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: colors.mutedForeground },
  phone: { marginTop: 4, fontFamily: fonts.body, fontSize: 13, color: colors.primary },
  callBtn: { padding: 8 },
  deleteBtn: { padding: 8 }
});
