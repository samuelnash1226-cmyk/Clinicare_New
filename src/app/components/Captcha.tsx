import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Volume2, ShieldCheck, Calculator, Sparkles, CheckCircle2 } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomText(length = 5): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return result;
}

interface MathProblem {
  num1: number;
  num2: number;
  op: '+' | '-';
  answer: number;
}

function generateMathProblem(): MathProblem {
  const isAddition = Math.random() > 0.4;
  if (isAddition) {
    const num1 = Math.floor(Math.random() * 15) + 2; // 2 - 16
    const num2 = Math.floor(Math.random() * 12) + 1; // 1 - 12
    return { num1, num2, op: '+', answer: num1 + num2 };
  } else {
    const num1 = Math.floor(Math.random() * 15) + 10; // 10 - 24
    const num2 = Math.floor(Math.random() * 9) + 1;   // 1 - 9
    return { num1, num2, op: '-', answer: num1 - num2 };
  }
}

export interface CaptchaProps {
  value: string;
  onChange: (val: string) => void;
  onValidationChange: (isValid: boolean) => void;
  refreshTrigger?: number;
  className?: string;
}

export function Captcha({
  value,
  onChange,
  onValidationChange,
  refreshTrigger = 0,
  className = '',
}: CaptchaProps) {
  const [mode, setMode] = useState<'visual' | 'math'>('visual');
  const [currentCode, setCurrentCode] = useState<string>(() => generateRandomText(5));
  const [mathProblem, setMathProblem] = useState<MathProblem>(() => generateMathProblem());
  const [isSpinning, setIsSpinning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate new challenge
  const regenerate = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 500);

    const newCode = generateRandomText(5);
    const newMath = generateMathProblem();
    setCurrentCode(newCode);
    setMathProblem(newMath);
    onChange('');
    onValidationChange(false);
  }, [onChange, onValidationChange]);

  // Handle external refresh trigger (e.g. failed login attempt)
  useEffect(() => {
    if (refreshTrigger > 0) {
      regenerate();
    }
  }, [refreshTrigger, regenerate]);

  // Check validation whenever value, mode, code, or mathProblem change
  useEffect(() => {
    let valid = false;
    if (mode === 'visual') {
      valid = Boolean(
        value.trim() &&
        value.trim().toUpperCase() === currentCode.toUpperCase()
      );
    } else {
      const parsed = parseInt(value.trim(), 10);
      valid = !isNaN(parsed) && parsed === mathProblem.answer;
    }
    onValidationChange(valid);
  }, [value, mode, currentCode, mathProblem, onValidationChange]);

  // Draw distorted characters on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 240;
    const height = 52;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Soft gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8fafc'); // slate-50
    gradient.addColorStop(0.5, '#ecfdf5'); // emerald-50
    gradient.addColorStop(1, '#f1f5f9'); // slate-100
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1;
    for (let x = 12; x < width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle =
        Math.random() > 0.5
          ? 'rgba(5, 150, 105, 0.35)'
          : 'rgba(100, 116, 139, 0.3)';
      ctx.fill();
    }

    // Curved interference lines
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 15, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width * 0.4,
        Math.random() * height,
        Math.random() * width * 0.7,
        Math.random() * height,
        width - Math.random() * 15,
        Math.random() * height
      );
      ctx.strokeStyle =
        i % 2 === 0 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(71, 85, 105, 0.35)';
      ctx.lineWidth = Math.random() * 1.5 + 1;
      ctx.stroke();
    }

    // Render characters
    const charSpacing = width / (currentCode.length + 1);
    const colors = ['#047857', '#0f766e', '#1e293b', '#065f46', '#334155'];
    const fonts = [
      'bold 25px "Inter", sans-serif',
      'bold 27px "Courier New", monospace',
      'bold 26px Arial, sans-serif',
    ];

    for (let i = 0; i < currentCode.length; i++) {
      ctx.save();
      const x = charSpacing * (i + 0.9);
      const y = height / 2 + (Math.random() * 6 - 3);
      ctx.translate(x, y);

      const angle = (Math.random() * 32 - 16) * (Math.PI / 180);
      ctx.rotate(angle);

      ctx.font = fonts[i % fonts.length];
      ctx.fillStyle = colors[i % colors.length];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(currentCode[i], 0, 0);
      ctx.restore();
    }
  }, [currentCode]);

  useEffect(() => {
    if (mode === 'visual') {
      const timer = setTimeout(drawCanvas, 15);
      return () => clearTimeout(timer);
    }
  }, [mode, currentCode, drawCanvas]);

  // Window resize redraw
  useEffect(() => {
    if (mode === 'visual') {
      const handleResize = () => drawCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [mode, drawCanvas]);

  // Audio readout using Web Speech API
  const playAudio = () => {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        toast.info('Audio readout is not supported on this browser.');
        return;
      }
      window.speechSynthesis.cancel();

      let text = '';
      if (mode === 'visual') {
        text = 'Security verification code: ' + currentCode.split('').join(' . ');
      } else {
        const opWord = mathProblem.op === '+' ? 'plus' : 'minus';
        text = `Security math challenge: What is ${mathProblem.num1} ${opWord} ${mathProblem.num2}?`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'visual' ? 'math' : 'visual'));
    regenerate();
  };

  const isVerified =
    mode === 'visual'
      ? Boolean(value.trim() && value.trim().toUpperCase() === currentCode.toUpperCase())
      : Boolean(value.trim() && parseInt(value.trim(), 10) === mathProblem.answer);

  return (
    <div
      className={`space-y-2.5 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-sm transition-all ${className}`}
    >
      {/* Header with Mode Toggle & Actions */}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-slate-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Security Verification</span>
        </Label>
        <div className="flex items-center gap-1">
          {/* Switch Challenge Type */}
          <button
            type="button"
            onClick={toggleMode}
            title={mode === 'visual' ? 'Switch to Math challenge' : 'Switch to Text code'}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/60 rounded-md transition-colors"
          >
            {mode === 'visual' ? (
              <>
                <Calculator className="h-3 w-3 text-emerald-600" />
                <span>Math</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-emerald-600" />
                <span>Text</span>
              </>
            )}
          </button>

          {/* Audio Button */}
          <button
            type="button"
            onClick={playAudio}
            title="Listen to code"
            aria-label="Listen to security code"
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/60 rounded-md transition-colors"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={regenerate}
            title="Refresh code"
            aria-label="Generate new security code"
            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/60 rounded-md transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSpinning ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Challenge Display */}
      {mode === 'visual' ? (
        <div
          onClick={regenerate}
          title="Click to refresh image"
          className="relative flex items-center justify-center bg-white rounded-lg p-1 border border-slate-200/90 shadow-inner overflow-hidden cursor-pointer select-none group hover:border-emerald-300 transition-colors"
        >
          <canvas ref={canvasRef} className="w-full h-[50px] block" />
          <span className="absolute bottom-1 right-2 text-[9px] text-slate-400 group-hover:text-emerald-600 transition-colors bg-white/80 px-1 rounded font-medium">
            Click to refresh
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[50px] bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-lg border border-emerald-200/80 shadow-inner px-4 select-none">
          <span className="text-sm font-bold text-slate-700 tracking-wider">
            Solve:{' '}
            <span className="text-emerald-700 font-extrabold text-base mx-1">
              {mathProblem.num1} {mathProblem.op} {mathProblem.num2}
            </span>{' '}
            = ?
          </span>
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === 'visual' ? 'Enter the 5 characters above' : 'Enter the solution'}
          maxLength={mode === 'visual' ? 6 : 4}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={`h-11 bg-white border-slate-200 rounded-lg pr-9 text-slate-800 font-medium tracking-wider text-sm transition-all duration-200 ${
            isVerified
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'focus:border-ndkc-green focus:ring-2 focus:ring-ndkc-green/20'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          {isVerified ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-fadeIn" />
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">
              {mode === 'visual' && value.length > 0 ? `${value.length}/5` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

