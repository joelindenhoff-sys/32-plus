"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header, Footer } from "../../../../components";
import { PropertyRow } from "../../../../../lib/data";
import { supabase } from "../../../../../lib/supabase";
import "../../../owner-tools.css";
import "./photos.css";

const bucket = "property-images";

async function optimiseImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const maxSide = 2200;
    const scale = Math.min(
      1,
      maxSide / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    if (!blob) throw new Error("This browser could not compress the photo.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function storagePath(publicUrl: string) {
  const marker = "/storage/v1/object/public/property-images/";
  if (!publicUrl.includes(marker)) return null;
  return decodeURIComponent(publicUrl.split(marker)[1].split("?")[0]);
}

export default function PhotoTour() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else {
          const row = data as PropertyRow;
          setProperty(row);
          setPhotos(
            row.photo_urls?.length
              ? row.photo_urls
              : row.image_url
                ? [row.image_url]
                : [],
          );
        }
      });
  }, [id]);

  async function persist(next: string[]) {
    const previous = photos;
    setPhotos(next);
    const { error: updateError } = await supabase
      .from("properties")
      .update({ photo_urls: next, image_url: next[0] || null })
      .eq("id", id);
    if (updateError) {
      setPhotos(previous);
      setError(updateError.message);
      return false;
    }
    return true;
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !property) return;
    setUploading(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return setError("Please sign in again.");
    }
    const next = [...photos];
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError(`${file.name} must be JPG, PNG or WebP.`);
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError(`${file.name} is larger than 25 MB.`);
        continue;
      }
      try {
        const compressed = await optimiseImage(file);
        if (compressed.size > 10 * 1024 * 1024) {
          setError(
            `${file.name} is still larger than 10 MB after compression.`,
          );
          continue;
        }
        const path = `${user.id}/${id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, compressed, { contentType: "image/webp" });
        if (uploadError) {
          setError(uploadError.message);
          continue;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        next.push(data.publicUrl);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : `Could not prepare ${file.name}.`,
        );
      }
    }
    await persist(next);
    setUploading(false);
    event.target.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }
  function cover(index: number) {
    persist([photos[index], ...photos.filter((_, i) => i !== index)]);
  }
  async function remove(index: number) {
    const photo = photos[index];
    if (!window.confirm("Remove this photo permanently?")) return;
    setRemoving(photo);
    setError("");
    const path = storagePath(photo);
    if (path) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([path]);
      if (removeError) {
        setRemoving(null);
        setError(removeError.message);
        return;
      }
    }
    await persist(photos.filter((_, i) => i !== index));
    setRemoving(null);
  }

  if (!property)
    return (
      <>
        <Header />
        <main className="owner-tool-page">
          <p>{error || "Loading photo tour…"}</p>
        </main>
      </>
    );
  return (
    <>
      <Header />
      <main className="owner-tool-page">
        <div className="owner-tool-header">
          <div>
            <Link href={`/dashboard/property/${id}`}>
              ← Back to property editor
            </Link>
            <p className="eyebrow">PHOTO TOUR</p>
            <h1>{property.title}</h1>
            <p className="photo-intro">
              The first image is the cover photo. Photos are resized and
              compressed automatically to save storage and load faster.
            </p>
          </div>
          <label className="upload-photos">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={upload}
            />
            {uploading ? "Optimising and uploading…" : "＋ Add photos"}
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        {photos.length ? (
          <div className="photo-tour-grid">
            {photos.map((photo, index) => (
              <article key={photo} className={index === 0 ? "cover-photo" : ""}>
                <img src={photo} alt={`Property photo ${index + 1}`} />
                {index === 0 && <span>Cover photo</span>}
                <div>
                  <button
                    disabled={index === 0 || Boolean(removing)}
                    onClick={() => cover(index)}
                  >
                    Make cover
                  </button>
                  <button
                    disabled={index === 0 || Boolean(removing)}
                    onClick={() => move(index, -1)}
                  >
                    ←
                  </button>
                  <button
                    disabled={index === photos.length - 1 || Boolean(removing)}
                    onClick={() => move(index, 1)}
                  >
                    →
                  </button>
                  <button
                    className="remove-photo"
                    disabled={Boolean(removing)}
                    onClick={() => remove(index)}
                  >
                    {removing === photo ? "Removing…" : "Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-photo-tour">
            <span>▧</span>
            <h2>Add photos of your property</h2>
            <p>
              Upload JPG, PNG or WebP images. Photos are converted to efficient
              WebP files automatically.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
