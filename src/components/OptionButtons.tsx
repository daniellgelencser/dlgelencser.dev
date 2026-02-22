import './OptionButtons.css'

export type Section = 'about' | 'experience' | 'projects' | 'contact'

interface Option {
  label: string
  section: Section
}

interface OptionButtonsProps {
  options: Option[]
  onSelect: (section: Section, label: string) => void
}

export default function OptionButtons({ options, onSelect }: OptionButtonsProps) {
  return (
    <div className="option-buttons">
      {options.map((opt) => (
        <button
          key={opt.section}
          className="option-btn"
          onClick={() => onSelect(opt.section, opt.label)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
