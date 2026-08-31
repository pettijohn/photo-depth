<script lang="ts">
  let {
    id,
    label,
    value,
    min = 0,
    max = 1,
    step = 0.01,
    disabled = false,
    onValue,
  }: {
    id: string;
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onValue: (value: number) => void;
  } = $props();
</script>

<div class="range-control">
  <div class="range-heading">
    <label for={id}>{label}</label>
    <output for={id}>{value.toFixed(2)}</output>
  </div>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {value}
    {disabled}
    oninput={(event) => onValue(Number(event.currentTarget.value))}
  />
</div>
