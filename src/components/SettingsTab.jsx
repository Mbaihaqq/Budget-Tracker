import React, { useState, useEffect } from 'react';
import { Moon, Sun, User, Camera, X, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Cropper from 'react-easy-crop'; // Library Crop
import getCroppedImg from '../utils/cropImage'; // Helper function tadi

export default function SettingsTab({ session, role, darkMode, setDarkMode }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const displayName = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0];

  // --- STATE UNTUK CROPPER ---
  const [imageSrc, setImageSrc] = useState(null); // Gambar mentah yang dipilih
  const [crop, setCrop] = useState({ x: 0, y: 0 }); // Posisi geser
  const [zoom, setZoom] = useState(1); // Level zoom
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null); // Koordinat hasil crop
  const [showCropper, setShowCropper] = useState(false); // Tampilkan modal crop?

  useEffect(() => {
    getProfile();
  }, [session]);

  const getProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
      if (data) setAvatarUrl(data.avatar_url);
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  // 1. Saat User Memilih File
  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result); // Simpan gambar ke state
        setShowCropper(true); // Buka modal crop
      });
      reader.readAsDataURL(file);
    }
  };

  // 2. Simpan Koordinat Crop saat digeser
  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  // 3. Proses Crop & Upload ke Supabase
  const handleSaveCrop = async () => {
    try {
      setUploading(true);
      
      // A. Potong Gambar menggunakan Helper
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // B. Siapkan File untuk Upload
      const fileName = `${session.user.id}_${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      // C. Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob);

      if (uploadError) throw uploadError;

      // D. Ambil URL Publik
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // E. Simpan URL ke Database Profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // F. Selesai
      setAvatarUrl(publicUrl);
      setShowCropper(false);
      setImageSrc(null);
      alert('Foto profil berhasil diupdate!');

    } catch (error) {
      alert("Gagal upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in pb-20">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pengaturan</h2>

      {/* --- CARD PROFIL --- */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700 text-center relative overflow-hidden">
        
        {/* Lingkaran Avatar */}
        <div className="relative w-32 h-32 mx-auto mb-4 group">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-emerald-100 dark:border-slate-600" />
          ) : (
            <div className="w-full h-full bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-600">
              <User size={48} />
            </div>
          )}

          {/* Tombol Pilih Foto */}
          <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
            <Camera size={24} />
            <span className="text-[10px] font-bold mt-1">Ganti Foto</span>
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
          
          {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full text-white text-xs font-bold">Saving...</div>}
        </div>
        
        <p className="text-gray-500 text-sm">Login sebagai</p>
        <h3 className="text-xl font-bold dark:text-white mt-1">{displayName}</h3>
        <span className="inline-block mt-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 dark:text-emerald-400 text-slate-600 rounded-full text-sm font-semibold uppercase">{role}</span>
      </div>

      {/* --- MODAL CROPPER (Hanya Muncul Saat Pilih Foto) --- */}
      {showCropper && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            
            {/* Header Modal */}
            <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 dark:text-white">Sesuaikan Foto</h3>
              <button onClick={() => {setShowCropper(false); setImageSrc(null);}}><X className="text-slate-500" /></button>
            </div>

            {/* Area Crop */}
            <div className="relative w-full h-64 bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1} // Rasio 1:1 (Kotak/Bulat)
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="round" // Visual lingkaran
                showGrid={false}
              />
            </div>

            {/* Slider Zoom */}
            <div className="p-4 border-b dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Zoom</p>
                <input 
                  type="range" 
                  value={zoom} 
                  min={1} max={3} step={0.1} 
                  onChange={(e) => setZoom(e.target.value)} 
                  className="w-full accent-emerald-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            {/* Tombol Aksi */}
            <div className="p-4 flex gap-3">
              <button 
                onClick={() => {setShowCropper(false); setImageSrc(null);}}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveCrop}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Check size={18} /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOMBOL DARK MODE --- */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {darkMode ? <Moon className="text-blue-400" /> : <Sun className="text-orange-400" />}
          <span className="font-bold dark:text-white">Mode Gelap</span>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-emerald-500' : 'bg-gray-300'}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
      
      <div className="text-center text-xs text-gray-400 mt-10">BudgetPWA v1.2.0 (Cropper)</div>
    </div>
  );
}