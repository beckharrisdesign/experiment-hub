import { AuthForm } from "./AuthForm";

/**
 * Section Signup: outer green (`18:3287`); inner gray block + form card per Figma `7:194` / `7:202`.
 *
 * @figma S8YJQugvMmn5jaRqwFM5XO:18:3287
 */
export function LandingSignupSection() {
  return (
    <section
      id="signup"
      className="px-4 py-16 scroll-mt-20 bg-[color:var(--green-dark)]"
    >
      <div className="max-w-xl mx-auto bg-[#f9fafb] rounded-[10px] px-10 py-[30px] flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-[#101828]">
            Get started for free
          </h2>
          <p className="text-[#4a5565] text-base">
            Enter your email and password. Same flow for new and returning
            users.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <AuthForm onSuccess={() => {}} embedded />
        </div>
      </div>
    </section>
  );
}
