import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MonitoringDashboard } from '@/components/dashboard/MonitoringDashboard';
import AgentPage from '@/components/agent/AgentPage';
import prisma from '@/lib/prisma';
import { DeploymentWithMetrics } from '@/types/deployment';

interface AgentPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: AgentPageProps): Promise<Metadata> {
  const agent = await prisma.deployment.findUnique({
    where: { id: params.id },
  });

  if (!agent) {
    return {
      title: 'Agent Not Found',
    };
  }

  return {
    title: `${agent.name} - Xeinst`,
    description: agent.description,
  };
}

export default async function Page({ params }: AgentPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/agent/' + params.id);
  }

  const agent = await prisma.deployment.findUnique({
    where: { id: params.id },
    include: {
      metrics: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      },
      feedbacks: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  if (!agent) {
    redirect('/404');
  }

  // Add required fields for DeploymentWithMetrics
  const deploymentWithMetrics: DeploymentWithMetrics = {
    ...agent,
    isPublic: agent.isPublic,
    version: agent.version,
    health: agent.health ?? {},
    metrics: agent.metrics.map(metric => ({
      ...metric,
      lastUpdated: metric.updatedAt
    }))
  };

  // Check if user has access to the agent
  if (
    deploymentWithMetrics.deployedBy !== session.user.id &&
    deploymentWithMetrics.accessLevel !== 'public' &&
    ((deploymentWithMetrics.accessLevel === 'premium' && session.user.subscriptionTier !== 'premium') ||
     (deploymentWithMetrics.accessLevel === 'basic' && session.user.subscriptionTier !== 'basic'))
  ) {
    redirect('/403');
  }

  const handleStart = async (id: string) => {
    'use server';
    await prisma.deployment.update({
      where: { id },
      data: { status: 'active' }
    });
  };

  const handleStop = async (id: string) => {
    'use server';
    await prisma.deployment.update({
      where: { id },
      data: { status: 'stopped' }
    });
  };

  const handleRestart = async (id: string) => {
    'use server';
    await prisma.deployment.update({
      where: { id },
      data: { status: 'pending' }
    });
  };

  const handleDelete = async (id: string) => {
    'use server';
    await prisma.deployment.delete({
      where: { id }
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <AgentPage 
          deployment={deploymentWithMetrics}
          onStart={handleStart}
          onStop={handleStop}
          onRestart={handleRestart}
          onDelete={handleDelete}
        />
        {deploymentWithMetrics.deployedBy === session.user.id && (
          <MonitoringDashboard agentId={params.id} />
        )}
      </div>
    </div>
  );
} 