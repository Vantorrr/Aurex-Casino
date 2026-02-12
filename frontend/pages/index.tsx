import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/games',
      permanent: false,
    },
  };
};

export default function HomePage() {
  // This page redirects to /games
  return null;
}
