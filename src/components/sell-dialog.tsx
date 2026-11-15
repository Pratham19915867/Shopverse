"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ImagePlus, Plus, ShieldCheck, Sparkles, Store, UploadCloud, X } from "lucide-react";
import { Dialog, Loading, requestJson } from "@/components/ui";
import { CATEGORIES, money, type Product } from "@/lib/types";

async function prepareImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Each original photo must be under 10 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("We couldn't read that photo."));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("That image couldn't be opened."));
      image.onload = () => {
        const ratio = Math.min(1, 1000 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        if (!context) { reject(new Error("Your browser couldn't prepare this photo.")); return; }
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL("image/jpeg", 0.82);
        if (result.length > 1500000) reject(new Error("That photo is too detailed. Please try a smaller one.")); else resolve(result);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function SellDialog({ onClose, onPublished, onView }: { onClose: () => void; onPublished: (product: Product) => void; onView: (product: Product) => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  async function addImages(files: FileList | File[]) {
    setError("");
    if (images.length + files.length > 4) { setError("You can add up to 4 photos per listing."); return; }
    setUploading(true);
    try { const prepared = await Promise.all(Array.from(files).map(prepareImage)); setImages((current) => [...current, ...prepared].slice(0, 4)); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try a different photo."); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!images.length) { setError("Add at least one photo to show off your product."); return; }
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { const { product } = await requestJson<{ product: Product }>("/api/products", { method: "POST", body: JSON.stringify({ ...data, images }) }); setPublished(product); onPublished(product); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <Dialog title="Sell your item" onClose={onClose} className="sell-dialog">
    {published ? <div className="publish-success"><span className="success-icon"><Check size={30} /></span><span className="eyebrow">HELLO, NEW CHAPTER</span><h2>You’re officially<br />on the shelf.</h2><p>Your item is live on Shopverse and ready to be discovered.</p><div className="published-product"><img src={published.images[0]} alt={published.name} /><div><span className="small-tag">LIVE LISTING</span><h3>{published.name}</h3><strong>{money(published.price)}</strong></div></div><button className="primary-button full-width" onClick={() => onView(published)}>See my live listing<ArrowUpRight size={18} /></button><button className="text-button" onClick={onClose}>Back to my universe<ArrowRight size={16} /></button></div> : <><div className="dialog-heading"><span className="round-feature"><Store size={24} /></span><span className="eyebrow">YOUR SELLER STORY STARTS HERE</span><h2>Good things deserve<br />to be discovered.</h2><p>List your item. Find its people. It’s that simple.</p></div><form onSubmit={publish} className="seller-form"><label className="field-label">Product photos <span>({images.length}/4)</span></label><input type="file" ref={inputRef} accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => event.target.files && addImages(event.target.files)} className="visually-hidden" aria-label="Upload product photos" />
      <div className={`photo-upload ${dragging ? "dragging" : ""} ${images.length ? "has-images" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!uploading) addImages(event.dataTransfer.files); }}>
        {images.length ? <div className="photo-previews">{images.map((image, index) => <div className="photo-preview" key={index}><img src={image} alt={`Product photo ${index + 1}`} /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => setImages((current) => current.filter((_, i) => i !== index))}><X size={13} /></button>{index === 0 && <span>Cover</span>}</div>)}{images.length < 4 && <button type="button" className="add-photo" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <Loading label="" /> : <><Plus size={24} /><span>Add photo</span></>}</button>}</div> : <button type="button" className="upload-trigger" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <Loading label="Getting your photos ready…" /> : <><span className="upload-icon"><UploadCloud size={26} /></span><strong>Drop your photos here, or <u>browse</u></strong><span>JPG, PNG or WebP · Up to 4 photos · 10 MB originals</span></>}</button>}
      </div><div className="photo-tip"><ImagePlus size={13} /> A clear first photo makes a lovely first impression.</div>
      <label className="field-label" htmlFor="product-name">Product name</label><input id="product-name" className="text-input" name="name" placeholder="Give your item a clear, catchy name" required minLength={3} maxLength={100} />
      <div className="form-grid"><div><label className="field-label" htmlFor="category">Category</label><select id="category" className="text-input" name="category" required defaultValue=""><option value="" disabled>Choose a category</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div><div><label className="field-label" htmlFor="brand">Brand or shop name <span>(optional)</span></label><input id="brand" className="text-input" name="brand" maxLength={50} placeholder="Your brand, your story" /></div></div>
      <div className="form-grid three-columns"><div><label className="field-label" htmlFor="price">Selling price (₹)</label><input id="price" className="text-input" type="number" name="price" min={1} max={10000000} step={1} placeholder="e.g. 999" required /></div><div><label className="field-label" htmlFor="original-price">Original price <span>(optional)</span></label><input id="original-price" className="text-input" type="number" name="originalPrice" min={1} max={10000000} step={1} placeholder="e.g. 1,499" /></div><div><label className="field-label" htmlFor="stock">Available quantity</label><input id="stock" className="text-input" type="number" name="stock" min={1} max={1000} step={1} defaultValue={1} required /></div></div>
      <label className="field-label" htmlFor="description">Tell us a little about it</label><textarea id="description" className="text-input" name="description" rows={3} minLength={15} maxLength={2000} placeholder="What makes it special? Include materials, dimensions, and condition." required />
      {error && <p className="form-error" role="alert">{error}</p>}<div className="seller-form-footer"><span><ShieldCheck size={16} />Your listing goes live right away.</span><button className="primary-button" type="submit" disabled={busy || uploading}>{busy ? <Loading label="Publishing…" /> : <>Publish my item<Sparkles size={17} /></>}</button></div></form></>}
  </Dialog>;
}
