<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean; size?: 'sm' | 'md' | 'lg' }>(), { compact: false, size: 'md' })
</script>

<template>
  <span
    class="brand-logo"
    :class="[`brand-logo--${size}`, { 'brand-logo--compact': compact }]"
  >
    <svg
      class="brand-logo__mark"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <rect
        width="48"
        height="48"
        rx="14"
        fill="url(#weekflow-gradient)"
      />
      <path
        d="M11 16.5 17.5 32 24 19l6.5 13L38 14"
        fill="none"
        stroke="white"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="m29 15 3.3 3.3L39 11.5"
        fill="none"
        stroke="white"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <defs>
        <linearGradient
          id="weekflow-gradient"
          x1="6"
          y1="5"
          x2="42"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#ff7138" />
          <stop
            offset="1"
            stop-color="#f03b00"
          />
        </linearGradient>
      </defs>
    </svg>
    <span
      v-if="!compact"
      class="brand-logo__wordmark"
      >Week<span>Flow</span></span
    >
  </span>
</template>

<style scoped src="~/presentation/assets/css/components/brand/brand-logo.css"></style>
