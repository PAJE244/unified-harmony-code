import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { ScriptImage } from "@/lib/scriptando-db";

interface Props { images: ScriptImage[] }

export default function GalleryCarousel({ images }: Props) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "center" });
  const [selected, setSelected] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla]);

  if (!images?.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/40 text-sm">
        Nenhuma imagem cadastrada ainda para esta plataforma.
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40" ref={emblaRef}>
          <div className="flex">
            {images.map((img, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 relative">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block w-full aspect-[16/10] bg-black cursor-zoom-in group/img"
                >
                  <img
                    src={img.url}
                    alt={img.caption || `Imagem ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-contain transition-transform duration-500 group-hover/img:scale-[1.02]"
                  />
                </button>
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-sm text-white/80">
                    {img.caption}
                  </div>
                )}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <ZoomIn className="w-3 h-3" /> Ampliar
                </div>
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={() => embla?.scrollPrev()}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white opacity-0 group-hover:opacity-100 transition-all items-center justify-center hover:bg-black/80"
              aria-label="Anterior"
            ><ChevronLeft className="w-5 h-5" /></button>
            <button
              onClick={() => embla?.scrollNext()}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white opacity-0 group-hover:opacity-100 transition-all items-center justify-center hover:bg-black/80"
              aria-label="Próxima"
            ><ChevronRight className="w-5 h-5" /></button>
          </>
        )}

        {images.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => embla?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === selected ? "w-8 bg-white" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
                aria-label={`Imagem ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={images}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onChange={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Lightbox({
  images, index, onClose, onChange,
}: { images: ScriptImage[]; index: number; onClose: () => void; onChange: (i: number) => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) onChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onChange, onClose]);

  const img = images[index];
  if (!img) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center z-10"
      ><X className="w-5 h-5" /></button>

      <div className="absolute top-5 left-5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-white/80 z-10">
        {index + 1} / {images.length}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); }}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs"
        >−</button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({x:0,y:0}); }}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs"
        >100%</button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(4, z + 0.5)); }}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs"
        >+</button>
      </div>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center z-10"
        ><ChevronLeft className="w-6 h-6" /></button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center z-10"
        ><ChevronRight className="w-6 h-6" /></button>
      )}

      <motion.img
        key={img.url}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        src={img.url}
        alt={img.caption || ""}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => { if (zoom > 1) dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
        onMouseMove={(e) => { if (dragRef.current) setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); }}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={() => { dragRef.current = null; }}
        style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, cursor: zoom > 1 ? "grab" : "zoom-in" }}
        onDoubleClick={(e) => { e.stopPropagation(); setZoom((z) => (z === 1 ? 2 : 1)); setPan({x:0,y:0}); }}
        className="max-w-[92vw] max-h-[85vh] object-contain transition-transform duration-200 select-none"
      />
    </motion.div>
  );
}
