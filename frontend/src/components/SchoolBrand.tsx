import schoolLogo from '../assets/logo.png';

type BrandMode = 'white-on-dark' | 'original-on-light' | 'original';

interface SchoolBrandProps {
    mode?: BrandMode;
    compact?: boolean;
    tiny?: boolean;
    className?: string;
}

export default function SchoolBrand({
    mode = 'white-on-dark',
    compact = false,
    tiny = false,
    className = '',
}: SchoolBrandProps) {
    const useWhiteFilter = mode === 'white-on-dark';
    const logoSrc = schoolLogo;
    const wrapperClass = mode === 'original-on-light'
        ? 'rounded-2xl border border-slate-300/50 bg-white/95 p-3 shadow-xl'
        : '';
    const sizeClass = tiny
        ? 'w-[clamp(90px,12vw,145px)]'
        : compact
            ? 'w-[clamp(120px,17vw,220px)]'
            : 'w-[clamp(190px,28vw,340px)]';

    return (
        <div className={`${wrapperClass} ${className}`.trim()}>
            <img
                src={logoSrc}
                alt="Colégio Santíssimo Senhor"
                className={`${sizeClass} h-auto max-w-full object-contain ${useWhiteFilter ? 'brightness-0 invert' : ''}`}
                draggable={false}
            />
        </div>
    );
}
