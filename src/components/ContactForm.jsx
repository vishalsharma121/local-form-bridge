import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    companyName: '',
    companyDomain: '',
    dealName: '',
    dealStage: 'appointmentscheduled',
    dealAmount: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const subjectOptions = [
    { value: '', label: 'Select a subject...' },
    { value: 'General Inquiry', label: 'General Inquiry' },
    { value: 'Sales & Product Info', label: 'Sales & Product Info' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Billing & Account', label: 'Billing & Account' },
    { value: 'Partnerships', label: 'Partnerships' },
    { value: 'Feedback / Other', label: 'Feedback / Other' },
  ];

  // --------------------------------------------------
  // DEBUG LOGGER
  // --------------------------------------------------

  const addDebugLog = (message, data = null) => {
    const time = new Date().toLocaleTimeString();

    const log = {
      time,
      message,
      data,
    };

    setDebugLogs((prev) => [...prev, log]);

    // Browser Console
    if (data !== null) {
      console.log(`[Contact Form ${time}] ${message}`, data);
    } else {
      console.log(`[Contact Form ${time}] ${message}`);
    }
  };

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Contact number is required';
    } else if (
      !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/.test(
        formData.phone
      ) ||
      formData.phone.trim().length < 7
    ) {
      newErrors.phone = 'Please enter a valid contact number';
    }

    if (!formData.subject) {
      newErrors.subject =
        'Please select a subject from the dropdown';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // --------------------------------------------------
  // INPUT CHANGE
  // --------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // --------------------------------------------------
  // FORM SUBMIT
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    addDebugLog('🚀 Submit button clicked');

    // Clear old submit error
    setErrors((prev) => ({
      ...prev,
      submit: '',
    }));

    // Validate form
    const isValid = validate();

    if (!isValid) {
      addDebugLog('❌ Validation failed', {
        errors: {
          name: !formData.name.trim()
            ? 'Full name is required'
            : undefined,

          email: !formData.email.trim()
            ? 'Email address is required'
            : undefined,

          phone: !formData.phone.trim()
            ? 'Contact number is required'
            : undefined,

          subject: !formData.subject
            ? 'Subject is required'
            : undefined,
        },
      });

      return;
    }

    addDebugLog('✅ Validation passed', {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      subject: formData.subject,
      message: formData.message,
    });

    setIsSubmitting(true);

    const startTime = performance.now();

    try {
      // ------------------------------------------------
      // API REQUEST
      // ------------------------------------------------

      addDebugLog(
        '📤 Sending POST request to /api/create-contact'
      );

      const res = await fetch('/api/create-contact', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          // Tell backend whether debug mode is enabled
          'x-debug-mode': debugMode ? 'true' : 'false',
        },

        body: JSON.stringify(formData),
      });

      const responseTime = Math.round(
        performance.now() - startTime
      );

      addDebugLog('📥 API response received', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        responseTime: `${responseTime} ms`,
      });

      // ------------------------------------------------
      // READ API RESPONSE
      // ------------------------------------------------

      let data;

      try {
        data = await res.json();
      } catch (jsonError) {
        addDebugLog(
          '❌ API returned invalid JSON',
          {
            error: jsonError.message,
          }
        );

        throw new Error(
          'Server returned an invalid response.',
          { cause: jsonError }
        );
      }

      addDebugLog('📦 API response data', data);

      // ------------------------------------------------
      // API ERROR
      // ------------------------------------------------

      if (!res.ok) {
        addDebugLog('❌ API request failed', {
          status: res.status,
          statusText: res.statusText,
          error: data,
        });

        throw new Error(
          data.error || 'Failed to submit form'
        );
      }

      // ------------------------------------------------
      // SUCCESS
      // ------------------------------------------------

      addDebugLog(
        '✅ Contact submitted successfully'
      );

      if (data.action) {
        addDebugLog(
          `🎯 HubSpot action: ${data.action.toUpperCase()}`
        );
      }

      if (data.id) {
        addDebugLog(
          `🆔 HubSpot Contact ID: ${data.id}`
        );
      }

      if (data.companyId) {
        addDebugLog(
          `🏢 HubSpot Company Created: "${data.companyName}" (ID: ${data.companyId})`
        );
      }

      if (data.dealId) {
        addDebugLog(
          `💼 HubSpot Deal Created: "${data.dealName}" (Stage: ${data.dealStage}, ID: ${data.dealId})`
        );
      }

      if (data.companyError) {
        addDebugLog(
          `⚠️ HubSpot Company Warning: ${data.companyError.message}`
        );
      }

      if (data.dealError) {
        addDebugLog(
          `⚠️ HubSpot Deal Warning: ${data.dealError.message}`
        );
      }

      if (data.debug) {
        addDebugLog(
          '🔐 Backend debug information',
          data.debug
        );
      }

      setSubmissionResult(data);
      setIsSubmitted(true);

    } catch (err) {
      console.error(
        '🔥 Contact form error:',
        err
      );

      addDebugLog(
        '❌ Submission failed',
        {
          error: err.message,
        }
      );

      setErrors((prev) => ({
        ...prev,
        submit:
          err.message ||
          'Something went wrong. Please try again.',
      }));

    } finally {
      setIsSubmitting(false);

      const totalTime = Math.round(
        performance.now() - startTime
      );

      addDebugLog('🏁 Request finished', {
        totalTime: `${totalTime} ms`,
      });
    }
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      companyName: '',
      companyDomain: '',
      dealName: '',
      dealStage: 'appointmentscheduled',
      dealAmount: '',
    });

    setErrors({});
    setIsSubmitted(false);

    addDebugLog('🔄 Form reset');
  };

  // --------------------------------------------------
  // DEBUG TOGGLE
  // --------------------------------------------------

  const toggleDebugMode = () => {
    setDebugMode((prev) => {
      const newValue = !prev;

      if (!newValue) {
        setDebugLogs([]);
      }

      console.clear();

      console.log(
        `🐞 Contact Form Debug Mode: ${newValue ? 'ON' : 'OFF'
        }`
      );

      return newValue;
    });
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 font-sans flex flex-col transition-colors">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-5xl">



        {/* ================================
            CONTACT FORM
        ================================= */}

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

          {/* Left Information Panel */}

          <div className="lg:col-span-5 bg-gradient-to-br from-[#F7941D] via-[#EE3124] to-[#C41C10] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">

            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="absolute -left-16 -top-16 w-64 h-64 bg-orange-300/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm">
                <span>11+ Years of Experience</span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                Let&apos;s build something great together
              </h2>

              <p className="text-white/90 text-sm leading-relaxed">
                Whether you have a question about features, pricing, need a custom integration demo, or want to explore our digital transformation services, our team is ready to help.
              </p>

              <div className="space-y-4 pt-2">

                {/* India Office Card */}
                <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 space-y-1.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-yellow-300">
                    <span>📍 INDIA OFFICE</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                    D 235 A, Near Hindustan Times, Sector 74, Mohali, Punjab 160074
                  </p>
                  <div className="text-xs font-mono text-white flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/10">
                    <span>✉ info@starkedge.com</span>
                    <span>☎ +91 9780970000</span>
                  </div>
                </div>

                {/* USA Office Card */}
                <div className="p-3.5 rounded-xl bg-white/10 border border-white/20 space-y-1.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-200">
                    <span>📍 USA OFFICE</span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                    350 Rhodes Island St, #240, Suite 233 San Francisco, CA 94103
                  </p>
                  <div className="text-xs font-mono text-white flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-white/10">
                    <span>✉ sales@starkedge.com</span>
                    <span>☎ +1 (209) 379-0229</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Trust badge */}
            <div className="relative z-10 pt-6 mt-8 border-t border-white/20 text-xs text-white/90 flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                <span>HubSpot Official Partner Bridge</span>
              </div>
              <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-[10px] text-white">Clutch ★ 4.9/5</span>
            </div>

          </div>

          {/* Right Form Panel */}

          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">

            {isSubmitted ? (

              /* ================================
                 SUCCESS MESSAGE
              ================================= */

              <div className="text-center py-10 space-y-4">

                <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm text-3xl">
                  ✓
                </div>

                <h3 className="text-2xl font-bold text-slate-900">
                  Thank You!
                </h3>

                <p className="text-slate-600 text-sm max-w-md mx-auto">

                  Your message has been successfully
                  submitted under{' '}

                  <span className="font-semibold text-slate-800">
                    &quot;{formData.subject}&quot;
                  </span>

                  . Our support representative will contact
                  you at{' '}

                  <span className="font-semibold text-slate-800">
                    {formData.email}
                  </span>

                  {' '}shortly.

                </p>

                {(submissionResult?.companyError || submissionResult?.dealError) && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs text-left max-w-md mx-auto space-y-1.5 shadow-sm">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <span>⚠️ HubSpot Sync Warning</span>
                    </div>
                    <p className="text-amber-700">
                      Your contact was saved, but some CRM records could not be created due to permission limits:
                    </p>
                    {submissionResult.companyError && (
                      <p className="font-mono text-[11px] text-amber-900 bg-amber-100/70 p-1.5 rounded">
                        • Company: {submissionResult.companyError.message}
                      </p>
                    )}
                    {submissionResult.dealError && (
                      <p className="font-mono text-[11px] text-amber-900 bg-amber-100/70 p-1.5 rounded">
                        • Deal: {submissionResult.dealError.message}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="mt-6 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
                >
                  Submit Another Request
                </button>

              </div>

            ) : (

              /* ================================
                 FORM
              ================================= */

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
              >

                <div className="mb-2">

                  <h3 className="text-2xl font-bold text-slate-900">
                    Send us a Message
                  </h3>

                  <p className="text-slate-500 text-sm mt-1">
                    Please fill out all the details below.
                  </p>

                </div>

                {/* Name + Email */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Name */}

                  <div>

                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Full Name{' '}
                      <span className="text-[#EE3124]">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.name
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-slate-300 focus:border-[#EE3124] focus:ring-orange-100'
                        } rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-4 transition-all`}
                    />

                    {errors.name && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.name}
                      </p>
                    )}

                  </div>

                  {/* Email */}

                  <div>

                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Email Address{' '}
                      <span className="text-[#EE3124]">
                        *
                      </span>
                    </label>

                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.email
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-slate-300 focus:border-[#EE3124] focus:ring-orange-100'
                        } rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-4 transition-all`}
                    />

                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}

                  </div>

                </div>

                {/* Phone + Subject */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* Phone */}

                  <div>

                    <label
                      htmlFor="phone"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Contact Number{' '}
                      <span className="text-[#EE3124]">
                        *
                      </span>
                    </label>

                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.phone
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-slate-300 focus:border-[#EE3124] focus:ring-orange-100'
                        } rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-4 transition-all`}
                    />

                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.phone}
                      </p>
                    )}

                  </div>

                  {/* Subject */}

                  <div>

                    <label
                      htmlFor="subject"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Subject{' '}
                      <span className="text-[#EE3124]">
                        *
                      </span>
                    </label>

                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${errors.subject
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-slate-300 focus:border-[#EE3124] focus:ring-orange-100'
                        } rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-4 transition-all cursor-pointer`}
                    >
                      {subjectOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          disabled={opt.value === ''}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {errors.subject && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.subject}
                      </p>
                    )}

                  </div>

                </div>

                {/* Message */}

                <div>

                  <div className="flex justify-between items-center mb-1.5">

                    <label
                      htmlFor="message"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                    >
                      Message / Additional Notes
                    </label>

                    <span className="text-xs text-slate-400 font-medium">
                      (Optional)
                    </span>

                  </div>

                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more about your inquiry or requirements..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-[#EE3124] focus:ring-4 focus:ring-orange-100 rounded-lg text-slate-900 text-sm focus:outline-none transition-all resize-none"
                  />

                </div>

                {/* Optional Company & Deal Info */}

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">

                  <div className="flex items-center justify-between">

                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">

                      🏢 Company & Deal Info

                    </span>

                    <span className="text-xs text-slate-400">

                      (Optional HubSpot Association)

                    </span>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Company Name (e.g. Acme Corp)"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />

                    <input
                      type="text"
                      name="companyDomain"
                      value={formData.companyDomain}
                      onChange={handleChange}
                      placeholder="Company Domain (e.g. acme.com)"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <input
                      type="text"
                      name="dealName"
                      value={formData.dealName}
                      onChange={handleChange}
                      placeholder="Deal Name (e.g. Acme Enterprise Deal)"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />

                    <select
                      name="dealStage"
                      value={formData.dealStage}
                      onChange={handleChange}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-200 cursor-pointer"
                    >
                      <option value="appointmentscheduled">Appointment Scheduled</option>
                      <option value="qualifiedtobuy">Qualified to Buy</option>
                      <option value="presentationscheduled">Presentation Scheduled</option>
                      <option value="decisionmakerboughtin">Decision Maker Bought-In</option>
                      <option value="contractsent">Contract Sent</option>
                      <option value="closedwon">Closed Won</option>
                      <option value="closedlost">Closed Lost</option>
                    </select>

                  </div>

                </div>

                {/* Submit Error */}

                {errors.submit && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    ❌ {errors.submit}
                  </div>
                )}

                {/* Submit Button */}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-[#F7941D] to-[#EE3124] hover:from-[#e58312] hover:to-[#d82417] text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.99] disabled:opacity-70 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >

                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>

                      Submitting...
                    </>
                  ) : (
                    <>
                      Send Request

                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </>
                  )}

                </button>

              </form>

            )}

          </div>

        </div>

      </div>

    </div>

    {/* ================================
        STARKEDGE BRAND FOOTER & OFFICE LOCATIONS
    ================================= */}
    <Footer />
    </div>
  );
}