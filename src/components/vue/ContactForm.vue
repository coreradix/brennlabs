<script setup lang="ts">
import { ref } from 'vue';

interface FormData {
  concernType: string;
  message: string;
}

const formData = ref<FormData>({
  concernType: '',
  message: '',
});

const isSubmitting = ref(false);
const submitStatus = ref<'idle' | 'success' | 'error'>('idle');
const errorMessage = ref('');

const concernOptions = [
  { value: 'Product Idea', label: 'Product Idea' },
  { value: 'General Inquiry', label: 'General Inquiry' },
  { value: 'Business Partnership', label: 'Business Partnership' },
  { value: 'Feedback', label: 'Feedback' },
  { value: 'Other Concerns', label: 'Other Concerns' },
];

const handleSubmit = (event: Event) => {
  event.preventDefault();

  if (!formData.value.concernType || !formData.value.message.trim()) {
    return;
  }

  isSubmitting.value = true;
  submitStatus.value = 'idle';
  errorMessage.value = '';

  const recipient = 'sales@brennlabs.shop';
  const subject = encodeURIComponent(
    `[${formData.value.concernType}] Contact Form Submission`
  );
  const body = encodeURIComponent(
    `Concern Type: ${formData.value.concernType}\n\nMessage:\n${formData.value.message.trim()}`
  );

  const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`;

  // Open email client
  window.location.href = mailtoLink;

  // Since we can't detect if mailto succeeded, assume success after a delay
  setTimeout(() => {
    isSubmitting.value = false;
    submitStatus.value = 'success';
    formData.value = { concernType: '', message: '' };
  }, 500);
};

const resetForm = () => {
  formData.value = { concernType: '', message: '' };
  submitStatus.value = 'idle';
  errorMessage.value = '';
};
</script>

<template>
  <form @submit="handleSubmit" class="space-y-4 sm:space-y-6" novalidate>
    <div>
      <label
        for="concern-type"
        class="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2"
      >
        Type of Concern <span class="text-cyan-600">*</span>
      </label>
      <select
        id="concern-type"
        v-model="formData.concernType"
        required
        class="w-full px-3 py-2 sm:px-4 sm:py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors bg-white text-slate-900 text-sm sm:text-base"
        :disabled="isSubmitting"
      >
        <option value="" disabled>Select a concern type</option>
        <option
          v-for="option in concernOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <div>
      <label
        for="message"
        class="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-2"
      >
        Message <span class="text-cyan-600">*</span>
      </label>
      <textarea
        id="message"
        v-model="formData.message"
        rows="5"
        required
        placeholder="Tell us more about your inquiry..."
        class="w-full px-3 py-2 sm:px-4 sm:py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors bg-white text-slate-900 placeholder-slate-400 resize-y min-h-[100px] sm:min-h-[140px] text-sm sm:text-base"
        :disabled="isSubmitting"
      ></textarea>
    </div>

    <button
      type="submit"
      :disabled="isSubmitting || !formData.concernType || !formData.message.trim()"
      class="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
    >
      <span v-if="isSubmitting" class="flex items-center gap-2">
        <svg
          class="animate-spin h-4 w-4 sm:h-5 sm:w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Opening email...
      </span>
      <span v-else>Send Message</span>
    </button>
  </form>
</template>

<style scoped>
/* Additional styles if needed */
</style>
