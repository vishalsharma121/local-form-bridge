import { useState } from 'react';
import Navbar from './Navbar';

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
          'Server returned an invalid response.'
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

      if (data.debug) {
        addDebugLog(
          '🔐 Backend debug information',
          data.debug
        );
      }

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-5xl">

        {/* ================================
            DEBUG PANEL
        ================================= */}

        <div className="mb-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Debug Header */}
          <div className="px-4 py-3 flex items-center justify-between">

            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                🐞 Developer Debug
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Monitor form submission and API activity
              </p>
            </div>

            <button
              type="button"
              onClick={toggleDebugMode}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${debugMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
            >
              🐞 Debug {debugMode ? 'ON' : 'OFF'}
            </button>

          </div>

          {/* Debug Console */}
          {debugMode && (
            <div className="border-t border-slate-200">

              <div className="bg-slate-950 text-white">

                {/* Console Header */}
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">

                  <div>
                    <h4 className="text-sm font-semibold">
                      🖥 Debug Console
                    </h4>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Frontend API activity
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDebugLogs([]);
                      console.clear();
                    }}
                    className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Clear
                  </button>

                </div>

                {/* Console Logs */}
                <div className="max-h-80 overflow-y-auto p-4 space-y-3 font-mono text-xs">

                  {debugLogs.length === 0 ? (
                    <div className="text-slate-500">
                      No debug activity yet...
                      <br />
                      Submit the form to see what happens.
                    </div>
                  ) : (
                    debugLogs.map((log, index) => (
                      <div
                        key={index}
                        className="border-b border-slate-800 pb-3 last:border-0"
                      >

                        <div className="text-slate-500 mb-1">
                          {log.time}
                        </div>

                        <div className="text-emerald-400">
                          {log.message}
                        </div>

                        {log.data && (
                          <pre className="mt-2 text-slate-300 whitespace-pre-wrap break-words">
                            {JSON.stringify(
                              log.data,
                              null,
                              2
                            )}
                          </pre>
                        )}

                      </div>
                    ))
                  )}

                </div>

              </div>

            </div>
          )}

        </div>

        {/* ================================
            CONTACT FORM
        ================================= */}

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

          {/* Left Information Panel */}

          <div className="lg:col-span-5 bg-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">

            <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="absolute -left-16 -top-16 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                Contact Us
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
                Let&apos;s build something great together
              </h2>

              <p className="text-slate-400 text-sm leading-relaxed">
                Whether you have a question about features,
                pricing, need a demo, or anything else, our
                team is ready to answer all your questions.
              </p>

              <div className="space-y-5 pt-4">

                {/* Email */}

                <div className="flex items-start gap-4">

                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-blue-400 shrink-0">
                    ✉
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Email Us
                    </h4>

                    <p className="text-sm font-medium text-white mt-0.5">
                      contact@company.com
                    </p>
                  </div>

                </div>

                {/* Phone */}

                <div className="flex items-start gap-4">

                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-blue-400 shrink-0">
                    ☎
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Call Us
                    </h4>

                    <p className="text-sm font-medium text-white mt-0.5">
                      +1 (800) 234-5678
                    </p>
                  </div>

                </div>

                {/* Address */}

                <div className="flex items-start gap-4">

                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-blue-400 shrink-0">
                    📍
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Headquarters
                    </h4>

                    <p className="text-sm font-medium text-white mt-0.5">
                      100 Tech Boulevard, Suite 400
                      <br />
                      San Francisco, CA 94107
                    </p>
                  </div>

                </div>

              </div>

            </div>

            <div className="relative z-10 pt-8 mt-8 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">

              <span className="text-emerald-400">
                ✓
              </span>

              <span>
                Your information is protected with
                end-to-end privacy.
              </span>

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

                <button
                  onClick={handleReset}
                  className="mt-6 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm cursor-pointer"
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
                      <span className="text-blue-600">
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
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
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
                      <span className="text-blue-600">
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
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
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
                      <span className="text-blue-600">
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
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
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
                      <span className="text-blue-600">
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
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-lg text-slate-900 text-sm focus:outline-none transition-all resize-none"
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
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />

                    <input
                      type="text"
                      name="companyDomain"
                      value={formData.companyDomain}
                      onChange={handleChange}
                      placeholder="Company Domain (e.g. acme.com)"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <input
                      type="text"
                      name="dealName"
                      value={formData.dealName}
                      onChange={handleChange}
                      placeholder="Deal Name (e.g. Acme Enterprise Deal)"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />

                    <select
                      name="dealStage"
                      value={formData.dealStage}
                      onChange={handleChange}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
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
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 active:scale-[0.99] disabled:opacity-70 transition-all flex items-center justify-center gap-2 cursor-pointer"
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

    </div>
  );
}