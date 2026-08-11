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

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}
.brand-logo__mark {
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  filter: drop-shadow(0 6px 12px rgb(254 80 17 / 0.18));
}
.brand-logo__wordmark {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 750;
  letter-spacing: -0.045em;
}
.brand-logo__wordmark span {
  color: #b93800;
}
:global(.dark) .brand-logo__wordmark span {
  color: #ff7138;
}
.brand-logo--sm .brand-logo__mark {
  width: 1.75rem;
  height: 1.75rem;
}
.brand-logo--lg .brand-logo__mark {
  width: 3rem;
  height: 3rem;
}
.brand-logo--lg .brand-logo__wordmark {
  font-size: 1.75rem;
}
</style>
