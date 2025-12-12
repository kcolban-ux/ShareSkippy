import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string().email('Please enter a valid email').required('Please enter an email'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'password must be at least 6 characters')
    .max(12, 'password must not be more than 12 characters'),
});

export const registerSchema = Yup.object().shape({
  fullName: Yup.string().required('Please Enter a Name'),
  email: Yup.string().email('Please Enter a Valid Email').required('Email is Rquired'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'password must be at least 6 characters')
    .max(12, 'password must not be more than 12 characters'),
  dob: Yup.date()
    .transform((value, originalValue) => {
      // Handle empty string or null/undefined
      if (!originalValue || originalValue === '') return undefined;
      return value;
    })
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'You must be at least 18 years old', function (value) {
      if (!value) return false;
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      return value <= cutoff;
    })
    .test('realistic', 'Please enter a valid date of birth', function (value) {
      if (!value) return false;
      const maxAge = new Date();
      maxAge.setFullYear(maxAge.getFullYear() - 120);
      return value >= maxAge;
    })
    .typeError('Please enter a valid date'),
});
