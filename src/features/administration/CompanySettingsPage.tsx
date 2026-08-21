import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, RotateCcw, Save } from 'lucide-react';
import { administrationService } from '@/services/administration.service';
import { queryKeys } from '@/lib/query-keys';
import { companySchema, type CompanyFormInput, type CompanyFormValues } from '@/schemas/company.schema';
import { toast } from '@/stores/toast.store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextInput } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/States';
import { FormActions, FormErrorSummary, FormSection, FullWidth } from '@/components/forms/FormLayout';
import { useUiStore, type TableDensity } from '@/stores/ui.store';
import { useCompanyStore } from '@/stores/company.store';
import { PERIOD_PRESETS, type PeriodPresetKey } from '@/utils/date';

export default function CompanySettingsPage() {
  useDocumentTitle('Pengaturan Perusahaan');
  const queryClient = useQueryClient();
  const density = useUiStore((state) => state.density);
  const setDensity = useUiStore((state) => state.setDensity);
  const defaultReportPeriod = useCompanyStore((state) => state.defaultReportPeriod);
  const setDefaultReportPeriod = useCompanyStore((state) => state.setDefaultReportPeriod);

  const { data: company, isPending } = useQuery({
    queryKey: queryKeys.company,
    queryFn: administrationService.getCompany,
  });

  const form = useForm<CompanyFormInput, unknown, CompanyFormValues>({
    resolver: zodResolver(companySchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      legalName: '',
      taxId: '',
      currency: 'IDR',
      fiscalYearStart: '01-01',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      phone: '',
      email: '',
      website: '',
    },
  });

  useEffect(() => {
    if (!company) return;
    form.reset({
      name: company.name,
      legalName: company.legalName,
      taxId: company.taxId,
      currency: company.currency,
      fiscalYearStart: company.fiscalYearStart,
      address: company.address,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode,
      phone: company.phone,
      email: company.email,
      website: company.website,
    });
  }, [company, form]);

  const mutation = useMutation({
    mutationFn: (values: CompanyFormValues) => administrationService.updateCompany(values),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Pengaturan tersimpan', `Data ${saved.name} telah diperbarui.`);
      form.reset(form.getValues());
    },
    onError: (error: Error) => toast.error('Pengaturan gagal disimpan', error.message),
  });

  const errors = form.formState.errors;
  const errorMessages = Object.values(errors)
    .map((error) => error?.message)
    .filter((message): message is string => typeof message === 'string');

  if (isPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan Perusahaan"
        description="Identitas badan hukum, periode buku, dan preferensi tampilan yang digunakan pada seluruh dokumen dan laporan."
      />

      <form onSubmit={(event) => event.preventDefault()}>
        <Panel>
          <FormErrorSummary messages={errorMessages} />

          <FormSection
            title="Identitas Perusahaan"
            description="Data ini tercetak pada faktur, laporan keuangan, dan dokumen resmi lainnya."
            columns={2}
          >
            <Field label="Nama Perusahaan" htmlFor="cname" required error={errors.name?.message}>
              <TextInput id="cname" invalid={Boolean(errors.name)} {...form.register('name')} />
            </Field>
            <Field label="Nama Badan Hukum" htmlFor="clegal" required error={errors.legalName?.message}>
              <TextInput id="clegal" invalid={Boolean(errors.legalName)} {...form.register('legalName')} />
            </Field>
            <Field label="NPWP" htmlFor="ctax" required error={errors.taxId?.message} hint="Format 01.234.567.8-045.000">
              <TextInput id="ctax" invalid={Boolean(errors.taxId)} {...form.register('taxId')} />
            </Field>
            <Field label="Situs Web" htmlFor="cweb" required error={errors.website?.message}>
              <TextInput id="cweb" invalid={Boolean(errors.website)} {...form.register('website')} />
            </Field>
          </FormSection>

          <FormSection title="Alamat dan Kontak" description="Alamat kedudukan perusahaan sesuai dokumen legal." columns={3}>
            <FullWidth>
              <Field label="Alamat" htmlFor="caddress" required error={errors.address?.message}>
                <TextInput id="caddress" invalid={Boolean(errors.address)} {...form.register('address')} />
              </Field>
            </FullWidth>
            <Field label="Kota" htmlFor="ccity" required error={errors.city?.message}>
              <TextInput id="ccity" invalid={Boolean(errors.city)} {...form.register('city')} />
            </Field>
            <Field label="Provinsi" htmlFor="cprovince" required error={errors.province?.message}>
              <TextInput id="cprovince" invalid={Boolean(errors.province)} {...form.register('province')} />
            </Field>
            <Field label="Kode Pos" htmlFor="cpostal" required error={errors.postalCode?.message}>
              <TextInput id="cpostal" invalid={Boolean(errors.postalCode)} {...form.register('postalCode')} />
            </Field>
            <Field label="Telepon" htmlFor="cphone" required error={errors.phone?.message}>
              <TextInput id="cphone" invalid={Boolean(errors.phone)} {...form.register('phone')} />
            </Field>
            <Field label="Email" htmlFor="cemail" required error={errors.email?.message}>
              <TextInput id="cemail" type="email" invalid={Boolean(errors.email)} {...form.register('email')} />
            </Field>
          </FormSection>

          <FormSection title="Periode Akuntansi" description="Menentukan awal tahun buku dan mata uang pelaporan." columns={2}>
            <Field label="Mata Uang Pelaporan" htmlFor="ccurrency" required error={errors.currency?.message}>
              <SelectInput id="ccurrency" {...form.register('currency')}>
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD — Dolar Amerika</option>
                <option value="SGD">SGD — Dolar Singapura</option>
                <option value="EUR">EUR — Euro</option>
              </SelectInput>
            </Field>
            <Field
              label="Awal Tahun Buku"
              htmlFor="cfiscal"
              required
              error={errors.fiscalYearStart?.message}
              hint="Format bulan-tanggal, contoh 01-01"
            >
              <TextInput id="cfiscal" placeholder="01-01" invalid={Boolean(errors.fiscalYearStart)} {...form.register('fiscalYearStart')} />
            </Field>
          </FormSection>

          <FormActions>
            <Button
              variant="outline"
              leadingIcon={<RotateCcw className="size-4" />}
              disabled={!form.formState.isDirty || mutation.isPending}
              onClick={() => company && form.reset()}
            >
              Kembalikan
            </Button>
            <Button
              variant="primary"
              leadingIcon={<Save className="size-4" />}
              loading={mutation.isPending}
              disabled={!form.formState.isDirty}
              onClick={form.handleSubmit((values) => mutation.mutate(values))}
            >
              Simpan pengaturan
            </Button>
          </FormActions>
        </Panel>
      </form>

      <Panel>
        <PanelHeader
          title="Preferensi Tampilan"
          description="Pengaturan ini berlaku pada perangkat yang Anda gunakan saat ini."
          compact
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Kepadatan Tabel" htmlFor="density" hint="Mode ringkas menampilkan lebih banyak baris per layar">
            <SelectInput id="density" value={density} onChange={(event) => setDensity(event.target.value as TableDensity)}>
              <option value="comfortable">Nyaman</option>
              <option value="compact">Ringkas</option>
            </SelectInput>
          </Field>
          <Field label="Periode Laporan Default" htmlFor="reportPeriod" hint="Periode yang dipilih saat membuka laporan">
            <SelectInput
              id="reportPeriod"
              value={defaultReportPeriod}
              onChange={(event) => setDefaultReportPeriod(event.target.value as PeriodPresetKey)}
            >
              {PERIOD_PRESETS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start gap-3 p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ink-200 bg-ink-50 text-ink-500">
            <Building2 className="size-4.5" aria-hidden />
          </span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink-900">Entitas Terdaftar</h3>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-500">
              Aplikasi mendukung pengelolaan beberapa entitas perusahaan. Gunakan pemilih entitas pada bilah atas untuk
              berpindah konteks data. Setiap entitas memiliki bagan akun, buku besar, dan laporan keuangan tersendiri.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
