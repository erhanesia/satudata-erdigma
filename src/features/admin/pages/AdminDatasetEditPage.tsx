import { Check, Loader2, Plus, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useDataset, useTopics } from "@/features/dataset/hooks/useDatasets";
import { ApiError } from "@/shared/api/errors";
import { QueryBoundary } from "@/shared/components/feedback/QueryBoundary";
import { Reveal } from "@/shared/components/motion/Reveal";
import { Dialog } from "@/shared/components/ui/Dialog";
import { useToast } from "@/shared/components/ui/toastStore";
import { formatNumber } from "@/shared/lib/format";
import type { AccessRule, Dataset, DatasetUpdate } from "@/shared/types/api";

import { AccessRulePicker } from "../components/AccessRulePicker";
import {
  MAX_FILES,
  existingFileRow,
  fileBlocker,
  newFileRow,
  type FileRowState,
} from "@/features/admin/lib/datasetFormState";

import {
  Card,
  CardHeader,
  Chip,
  Field,
  FileRow,
  TextInput,
} from "../components/DatasetFormParts";
import { FormatBadge } from "../components/FormatBadge";
import { useDatasetAdmin } from "../hooks/useDatasetAdmin";

/**
 * Menyunting dataset yang sudah terbit.
 *
 * <h2>Sengaja kembar dengan layar penerbitan</h2>
 *
 * Susunan kartunya sama, nama ruasnya sama, baris berkasnya komponen yang sama,
 * dan pemilih aksesnya komponen yang sama. Orang yang sudah pernah menerbitkan
 * dataset tidak semestinya perlu belajar ulang untuk menyuntingnya, dan
 * kesamaan itu dijaga dengan MEMAKAI potongan yang sama lewat
 * `DatasetFormParts` — bukan dengan menyalinnya lalu berharap keduanya tidak
 * menyimpang.
 *
 * Yang membedakan hanya arahnya: layar ini berangkat dari keadaan yang sudah
 * ada, dan menyimpan berarti mengubah sesuatu yang sudah dibaca orang.
 *
 * <h2>Yang bisa dilakukan pada berkas</h2>
 *
 * Sama dengan layar penerbitan, ditambah yang hanya masuk akal di sini:
 * menambah, mengganti nama, mengganti isinya, dan membuang. Semuanya berangkat
 * dalam SATU permintaan sebagai keadaan akhir yang diinginkan, bukan rentetan
 * perintah — sehingga tidak ada keadaan setengah jalan tempat berkas lama sudah
 * hilang tetapi penggantinya belum masuk.
 *
 * <h2>Yang tetap tidak bisa diubah dari sini</h2>
 *
 * <b>Slug.</b> Ia tidak ikut berganti meski judulnya diganti, dan itu disebut
 * terang di layar — kalau tidak, penyunting akan menduga alamatnya ikut
 * menyesuaikan lalu membagikan tautan yang tidak pernah ada.
 *
 * <b>Pengunggah.</b> Kartunya menyebut penerbit ASLINYA, bukan orang yang
 * sedang menyunting. Kolom itu jejak siapa yang bertanggung jawab atas dataset
 * ini; yang mencatat siapa menyunting apa adalah log audit.
 */
export default function AdminDatasetEditPage() {
  const { slug = "" } = useParams();
  // `recordView` mati: membuka layar pengelolaan bukan mengunjungi datasetnya,
  // dan penyuntingnya tidak seharusnya menaikkan sendiri angka kunjungannya.
  const query = useDataset(slug, false);

  return (
    <QueryBoundary
      query={query}
      loading={
        <div className="h-[60dvh] animate-pulse rounded-lg bg-white shadow-[0_1px_2px_rgba(16,24,40,.06)]" />
      }
    >
      {(dataset) => <EditForm key={dataset.slug} dataset={dataset} />}
    </QueryBoundary>
  );
}

function EditForm({ dataset }: { dataset: Dataset }) {
  const slug = dataset.slug ?? "";
  const topics = useTopics();
  const { update } = useDatasetAdmin();
  const toast = useToast();
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileRowState[]>(() =>
    (dataset.resources ?? []).map(existingFileRow),
  );
  const [title, setTitle] = useState(dataset.title ?? "");
  const [description, setDescription] = useState(dataset.notes ?? "");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => [
    ...(dataset.topics ?? []),
  ]);
  const [accessRules, setAccessRules] = useState<AccessRule[]>(
    () => (dataset.accessRules ?? []) as AccessRule[],
  );
  // Dataset yang baru tersimpan: penanda sekaligus isi pop-up berhasil.
  const [saved, setSaved] = useState<Dataset | null>(null);

  /*
    Isian disegarkan kalau datasetnya berganti.

    Perpindahan antar dataset sudah ditangani `key` pada pemanggilnya, jadi yang
    benar-benar dijaga di sini keadaan yang lebih halus: respons penyimpanan
    membawa daftar berkas yang BARU, dan id berkas pengganti berbeda dari
    pendahulunya. Tanpa penyegaran ini formulir masih memegang id yang sudah
    tidak ada, dan menekan Simpan sekali lagi akan ditolak back-end dengan
    "berkas bukan milik dataset ini" — galat yang tidak masuk akal bagi orang
    yang cuma menyimpan dua kali.
  */
  useEffect(() => {
    setFiles((dataset.resources ?? []).map(existingFileRow));
    setTitle(dataset.title ?? "");
    setDescription(dataset.notes ?? "");
    setSelectedTopics([...(dataset.topics ?? [])]);
    setAccessRules((dataset.accessRules ?? []) as AccessRule[]);
  }, [dataset]);

  function change(rowKey: number, ubahan: Partial<FileRowState>) {
    setFiles((previous) =>
      previous.map((b) => (b.rowKey === rowKey ? { ...b, ...ubahan } : b)),
    );
  }

  /**
   * Alasan tombol Simpan belum bisa ditekan, atau null kalau sudah siap.
   *
   * Syarat berkasnya dipakai bersama formulir terbit, supaya penolakan yang
   * sama tidak berbunyi berbeda di dua layar yang sengaja dibuat kembar.
   */
  const blocker: string | null =
    fileBlocker(files) ?? (!title.trim() ? "Judul dataset belum diisi" : null);

  function submit() {
    if (blocker) return;

    /*
      Baris yang memegang berkas baru dikirim sebagai berkas BARU, termasuk
      baris yang berasal dari berkas lama.

      Itulah cara "ganti file" bekerja tanpa endpoint tersendiri: id lamanya
      cukup tidak ikut disebutkan, sehingga back-end melepasnya, dan
      penggantinya masuk sebagai entri tanpa id. Keduanya dalam satu transaksi.
    */
    const body: DatasetUpdate = {
      title: title.trim(),
      // Dikirim apa adanya, termasuk saat kosong. String kosong berarti
      // "kosongkan" di back-end, dan itu memang yang dimaksud penyunting kalau
      // ia menghapus isinya.
      notes: description,
      topics: selectedTopics,
      // Selalu disertakan, bahkan saat kosong. Ruas keamanan yang hilang
      // ditolak back-end dengan 400 — disengaja, supaya "lupa mengirim" tidak
      // pernah berakibat sama dengan "sengaja membuka".
      accessRules,
      files: files.map((b) =>
        b.file
          ? { label: b.label.trim(), format: b.kind }
          : { id: b.id, label: b.label.trim() },
      ),
    };

    // Urutannya SAMA dengan urutan entri tanpa `id` di atas, karena back-end
    // memasangkan keduanya menurut urutan itu.
    const uploads = files.filter((b) => b.file).map((b) => b.file as File);

    update.mutate(
      { slug, body, files: uploads },
      {
        onSuccess: (next) => setSaved(next),
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : "Dataset gagal disimpan.",
          ),
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5 pb-10 sm:pb-16">
      <Reveal>
        <Card>
          <CardHeader
            title="File"
            description="Berkas yang sudah tersimpan dimuat di bawah. Tambahkan, ganti namanya, ganti isinya, atau buang."
          />

          {files.map((b, i) => (
            <FileRow
              key={b.rowKey}
              rows={b}
              rowNumber={i + 1}
              onChangeRow={(u) => change(b.rowKey, u)}
              onRemove={() =>
                setFiles((previous) =>
                  previous.filter((x) => x.rowKey !== b.rowKey),
                )
              }
            />
          ))}

          {files.length < MAX_FILES ? (
            <button
              type="button"
              onClick={() => setFiles((previous) => [...previous, newFileRow()])}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD2DC] py-4 text-[16px] font-bold text-[#4B5563] transition-colors hover:border-[#4F6BED] hover:bg-[#F7F9FF] hover:text-[#4F6BED]"
            >
              <Plus className="size-[18px]" />
              Tambah file
            </button>
          ) : (
            <p className="mt-4 rounded-lg bg-[#F8FAFC] py-3 text-center text-[13.5px] text-[#9CA3AF]">
              Maksimal {MAX_FILES} berkas dalam satu dataset.
            </p>
          )}
        </Card>
      </Reveal>

      <Reveal delay={70}>
        <Card>
          <Field label="Judul dataset" required>
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="Contoh: Rekap Capaian Kinerja Unit"
            />
            {/*
              Disebut terang-terangan tepat di bawah isian judulnya, bukan
              disembunyikan di kartu lain. Kalau tidak, penyunting yang mengganti
              judul akan menduga alamatnya ikut menyesuaikan, lalu membagikan
              tautan yang tidak pernah ada.
            */}
            <p className="mt-2 text-[13px] leading-relaxed text-[#9CA3AF]">
              Alamat dataset tetap{" "}
              <span className="font-mono text-[#6B7280]">{slug}</span> meski
              judulnya diganti, supaya tautan yang sudah dibagikan tidak mati.
            </p>
          </Field>

          <Field label="Deskripsi dataset">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Jelaskan isi dataset ini dan untuk apa dipakai."
              className="w-full resize-y rounded-lg border border-[#E9EBF0] px-3.5 py-3 text-[16px] leading-relaxed text-[#3C4A56] outline-none transition-colors focus:border-[#4F6BED] placeholder:text-[#9CA3AF]"
            />
            <div className="mt-1.5 text-[13px] text-[#9CA3AF]">
              {formatNumber(description.length)} karakter
            </div>
          </Field>

          <Field
            label="Topik"
            hint="Menentukan dataset ini muncul di penyaring topik yang mana. Boleh lebih dari satu."
          >
            <div className="flex flex-wrap gap-2">
              {(topics.data ?? []).map((t) => (
                <Chip
                  key={t.id}
                  active={selectedTopics.includes(t.name ?? "")}
                  onClick={() =>
                    setSelectedTopics((previous) =>
                      previous.includes(t.name ?? "")
                        ? previous.filter((x) => x !== t.name)
                        : [...previous, t.name ?? ""],
                    )
                  }
                >
                  {t.name}
                </Chip>
              ))}
            </div>
          </Field>
        </Card>
      </Reveal>

      <div className="grid gap-3.5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <Reveal delay={140} className="h-full min-w-0">
          <Card full>
            <CardHeader
              title="Diunggah oleh"
              description="Penerbit aslinya, dicatat sekali saat dataset terbit. Tidak berpindah ke penyunting."
            />
            <div className="flex items-center gap-3.5 rounded-[10px] border border-[#E9EBF0] px-4 py-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E9EBF0]">
                <User className="size-5 text-[#6B7280]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-semibold text-[#2E3646]">
                  {dataset.uploadedBy?.name ?? "—"}
                </span>
                <span className="block truncate text-[13.5px] text-[#6B7280]">
                  {[
                    dataset.uploadedBy?.position,
                    dataset.uploadedBy?.divisionCode,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </span>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={190} className="h-full min-w-0">
          <Card full>
            <div className="mb-3.5">
              <h2 className="text-[17px] font-bold text-[#2E3646]">
                Siapa yang boleh melihat
              </h2>
            </div>

            {/*
              Sudah menyala sesuai aturan yang berlaku sekarang. Itu syarat,
              bukan kenyamanan: daftar yang dikirim MENGGANTI, bukan menambah,
              jadi pemilih yang dibuka kosong akan diam-diam membuka dataset ini
              untuk seluruh karyawan begitu Simpan ditekan.
            */}
            <AccessRulePicker
              value={accessRules}
              onChange={setAccessRules}
              disabled={update.isPending}
            />
          </Card>
        </Reveal>
      </div>

      <Reveal delay={240}>
        <div className="flex flex-col-reverse gap-3 rounded-lg bg-white px-4 py-4 shadow-[0_1px_2px_rgba(16,24,40,.06)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => void navigate(paths.adminDatasets)}
            className="rounded-lg py-2 text-[16px] font-bold text-[#4B5563] transition-colors hover:text-[#2E3646] sm:py-0"
          >
            Batal
          </button>

          <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-4">
            <span
              className={[
                "text-center text-[14px] sm:text-left",
                update.isPending
                  ? "text-[#4B5563]"
                  : blocker
                    ? "text-[#B45309]"
                    : "text-[#137A46]",
              ].join(" ")}
            >
              {/*
                Saat penyimpanan berjalan, baris ini berhenti melaporkan
                kesiapan dan mulai melaporkan kemajuan — sama seperti pada
                penerbitan, dan karena alasan yang sama: sebagian besar waktunya
                dihabiskan SETELAH byte terakhir terkirim, saat back-end membaca
                berkasnya lalu memasukkan barisnya.
              */}
              {update.isPending
                ? update.progress < 100
                  ? `Mengunggah berkas… ${update.progress}%`
                  : "Berkas terkirim. Sedang menyimpan, mohon tunggu — jangan tutup halaman ini."
                : (blocker ?? "Perubahan berlaku seketika setelah disimpan.")}
            </span>
            <button
              type="button"
              disabled={Boolean(blocker) || update.isPending}
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F2A37] px-7 py-3 text-[16px] font-bold text-white transition-colors hover:bg-[#111A24] disabled:cursor-not-allowed disabled:bg-[#E9EBF0] disabled:text-[#9CA3AF] sm:w-auto"
            >
              {update.isPending ? (
                <Loader2 className="size-[18px] animate-spin" />
              ) : (
                <Save className="size-[18px]" />
              )}
              Simpan perubahan
            </button>
          </div>
        </div>
      </Reveal>

      <SavedDialog
        dataset={saved}
        onClose={() => {
          setSaved(null);
          void navigate(paths.adminDatasets);
        }}
        onOpenDetail={() => {
          setSaved(null);
          void navigate(slug ? paths.datasetDetail(slug) : paths.adminDatasets);
        }}
      />
    </div>
  );
}

/**
 * Pop-up setelah perubahan tersimpan.
 *
 * Sekeluarga dengan pop-up setelah penerbitan, dengan alasan yang sama:
 * perubahan aturan akses berlaku seketika dan menyentuh siapa yang bisa membuka
 * data. Kabar semacam itu tidak boleh lewat toast yang hilang sendiri sebelum
 * sempat dibaca.
 *
 * Angkanya diambil dari respons penyimpanan, bukan dari isian formulir. Jumlah
 * baris dan kolom baru diketahui setelah berkasnya dibaca server, dan
 * menampilkan apa yang benar-benar tersimpan adalah satu-satunya cara pop-up
 * ini menjadi konfirmasi, bukan sekadar ucapan selamat.
 */
function SavedDialog({
  dataset,
  onClose,
  onOpenDetail,
}: {
  dataset: Dataset | null;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  const files = dataset?.resources ?? [];

  return (
    <Dialog
      open={dataset !== null}
      onOpenChange={(next) => !next && onClose()}
      title="Perubahan tersimpan"
      description={dataset?.title ?? ""}
    >
      <div className="flex items-center gap-3.5 rounded-[10px] border border-[#CDE9D8] bg-[#F2FBF6] px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DCF3E6]">
          <Check className="size-5 text-[#137A46]" strokeWidth={3} />
        </span>
        <div className="min-w-0 text-[13.5px] leading-relaxed text-[#137A46]">
          Perubahannya berlaku sekarang. Karyawan di luar aturan akses yang baru
          langsung kehilangan akses membuka dan mengunduh dataset ini.
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat label="Berkas" value={`${files.length}`} />
        <Stat label="Baris" value={formatNumber(dataset?.rowCount ?? 0)} />
        <Stat label="Kolom" value={formatNumber(dataset?.colCount ?? 0)} />
      </dl>

      <div className="mt-3 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
        <div className="font-mono text-[12.5px] text-[#6B7280]">
          {dataset?.slug}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {files.map((r) => (
            <FormatBadge key={r.id} ext={(r.formatName ?? "").toUpperCase()} />
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#E9EBF0] px-4 py-2.5 text-[14px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC]"
        >
          Ke daftar dataset
        </button>
        <button
          type="button"
          onClick={onOpenDetail}
          className="rounded-lg bg-[#1F2A37] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#111A24]"
        >
          Lihat dataset
        </button>
      </div>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
      <dt className="text-[12.5px] text-[#9CA3AF]">{label}</dt>
      <dd className="mt-0.5 text-[19px] leading-none font-bold text-[#2E3646]">
        {value}
      </dd>
    </div>
  );
}
