'use client';
import Link from 'next/link';
import Image from 'next/image';
import bgshare from '../bgShareskippy.png';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { registerSchema } from '@/utils/formValidator';
const Page = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registerSchema),
  });
  return (
    <div className="mx-auto max-w-5xl min-h-screen  p-5 flex justify-between items-center gap-5  ">
      <div className="max-w-[600px] mx-auto p-6 bg-white shadow-xl rounded-lg">
        <div className="mt-5">
          <h1 className="text-5xl font-bold text-center">Create New Account </h1>
          <p className="text-center mt-5  text-xl">
            Already Registered ?{' '}
            <Link href="/sign-in" className="text-blue-500">
              Login
            </Link>
          </p>
        </div>
        <form onSubmit={handleSubmit()} className="w-full lg:w-[520px] mt-3 p-6 ">
          <div className="flex flex-col justify-start my-4">
            <label htmlFor="name" className="mb-3">
              NAME
            </label>
            <input
              id="fullName"
              {...register('fullName')}
              type="text"
              placeholder="Jira Martins"
              className="w-full h-[50px]  outline-1 outline-gray-400  px-4 py-3 rounded-lg"
            />
            {errors.fullName && (
              <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
            )}
          </div>
          <div className="flex flex-col justify-start my-4">
            <label htmlFor="email" className="mb-3">
              EMAIL
            </label>
            <input
              id="email"
              {...register('email')}
              type="email"
              placeholder="hello@realygreatsite.com"
              className="w-full h-[50px]  outline-1 outline-gray-400  px-4 py-3 rounded-lg"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col justify-start my-4">
            <label htmlFor="password" className="mb-3">
              PASSWORD
            </label>
            <input
              id="password"
              {...register('password')}
              type="password"
              placeholder="******"
              className="w-full h-[50px]  outline-1 outline-gray-400  px-4 py-3 rounded-lg"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          <div className="flex flex-col justify-start my-4">
            <label htmlFor="dob" className="mb-3">
              DATE OF BIRTH
            </label>
            <input
              id="dob"
              {...register('dob')}
              type="date"
              placeholder="Jira Martins"
              className="w-full h-[50px] outline-1 outline-gray-400 px-4 py-3 rounded-lg"
            />
            {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob.message}</p>}
          </div>

          <button className="mt-10 bg-blue-400 text-white flex justify-center  items-center w-[150px] h-[50px] mx-auto rounded-lg cursor-pointer">
            Sign Up
          </button>
        </form>
      </div>
      <div className="hidden lg:block">
        <Image src={bgshare} alt="shareskipy bg" className="w-full h-[720px] rounded-lg" />
      </div>
    </div>
  );
};

export default Page;
