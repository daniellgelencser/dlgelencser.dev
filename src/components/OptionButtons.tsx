import './OptionButtons.css'

// Accept arbitrary string identifiers so this component can be reused for
// directory navigation as well as the original section shortcuts.
export type Section = string

interface Option {
  label: string
  section?: Section
}

interface OptionButtonsProps {
  options: Option[]
  onSelect: (section: Section | undefined, label: string) => void
}

export default function OptionButtons({ options, onSelect }: OptionButtonsProps) {
  return (
    <div className="option-buttons">
      {options.map((opt, idx) => (
        <button
          key={opt.section ?? opt.label + idx}
          className="option-btn"
          onClick={() => onSelect(opt.section, opt.label)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
