import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  SwitchCamera
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isNativeApp, captureNativePhoto, describeNativeError } from '../utils/nativeBridge';

export default function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Camera Capture',
  facingMode = 'user', // 'user' (Selfie / Front) | 'environment' (Depot / Back)
  helperText = 'Please position yourself in the frame and take a clear photo.'
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [currentFacingMode, setCurrentFacingMode] = useState(facingMode);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Inside the Android app the capture happens in the native camera (camera-only, with native permission
  // handling); the result comes back here and goes through the same onCapture/onClose flow as the web camera.
  const nativeCamera = isNativeApp();
  const onCaptureRef = useRef(onCapture);
  const onCloseRef = useRef(onClose);
  onCaptureRef.current = onCapture;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !nativeCamera) return undefined;
    let cancelled = false;
    captureNativePhoto(facingMode)
      .then(({ file, dataUrl }) => {
        if (cancelled) return;
        if (onCaptureRef.current) onCaptureRef.current(file, dataUrl);
        onCloseRef.current();
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.code !== 'CAMERA_CANCELLED') toast.error(describeNativeError(err));
        onCloseRef.current();
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, facingMode, nativeCamera]);

  // Sync facingMode when modal opens
  useEffect(() => {
    if (nativeCamera) return undefined;
    if (isOpen) {
      setCurrentFacingMode(facingMode);
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError('');
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (mode) => {
    stopCamera();
    setIsStarting(true);
    setCameraError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (err) {
      console.warn('[Live Camera Error]', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(err.message || 'Unable to open camera stream.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const switchCamera = () => {
    const nextMode = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(nextMode);
    startCamera(nextMode);
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image for natural selfie feel
    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);

    // Convert dataUrl to File / Blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedBlob(file);
        }
      },
      'image/jpeg',
      0.88
    );

    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera(currentFacingMode);
  };

  const confirmPhoto = () => {
    if (capturedBlob && onCapture) {
      onCapture(capturedBlob, capturedImage);
      onClose();
    }
  };

  // Direct Mobile Fallback via input capture attribute
  const handleMobileFallbackChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (onCapture) {
          onCapture(file, event.target.result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen || nativeCamera) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-center animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">{title}</h3>
              <p className="text-[11px] text-amber-400 font-bold">🔴 Live Camera Required (No Gallery Pick)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport / Video Area */}
        <div className="relative w-full h-72 sm:h-80 rounded-2xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Live Capture Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${currentFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Overlay Guide Frame */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/30 rounded-2xl m-6 flex items-center justify-center">
                {currentFacingMode === 'user' ? (
                  <div className="w-40 h-52 rounded-[50%] border-2 border-dashed border-blue-400/50" />
                ) : (
                  <div className="w-full h-full border border-blue-400/30 rounded-xl" />
                )}
              </div>

              {/* Camera Loading Spinner */}
              {isStarting && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-blue-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-semibold">Opening Live Camera...</span>
                </div>
              )}
            </>
          )}

          {/* Hidden Canvas for Snapping */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <p className="text-xs text-slate-400">{helperText}</p>

        {/* Camera Error Message */}
        {cameraError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{cameraError}</span>
            </div>
            {/* Native Mobile Camera Capture Fallback */}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <span>Open Device Camera App</span>
              <input
                type="file"
                accept="image/*"
                capture={currentFacingMode}
                onChange={handleMobileFallbackChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={retakePhoto}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={confirmPhoto}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Use This Live Photo</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={switchCamera}
                disabled={!isCameraActive}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <SwitchCamera className="w-4 h-4" />
                <span>Flip Camera</span>
              </button>

              <button
                type="button"
                onClick={snapPhoto}
                disabled={!isCameraActive}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95"
              >
                <Camera className="w-5 h-5" />
                <span>Capture Live Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

