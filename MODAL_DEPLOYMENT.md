# Modal Deployment Guide

This guide explains how to deploy the 夢酒館 RAG 品牌大使 application to Modal.

## 🎯 Why Modal?

Modal provides serverless deployment for Python applications with several advantages:

- ✅ **Auto-scaling**: Scales to zero when not in use, scales up automatically with traffic
- ✅ **Cost-effective**: Pay only for actual usage, no idle costs
- ✅ **No infrastructure management**: No need to manage servers or containers
- ✅ **Built-in secrets management**: Secure API key storage
- ✅ **Persistent storage**: Modal Volumes for FAISS database
- ✅ **Fast cold starts**: Keep containers warm with `keep_warm` setting

## 📋 Prerequisites

1. **Modal Account**: Sign up at [modal.com](https://modal.com)
2. **Modal CLI**: Install and authenticate
3. **FAISS Database**: Your local `app/faiss_db` directory must exist
4. **OpenAI API Key**: Required for the RAG pipeline

## 🚀 Quick Start

### Step 1: Install Modal CLI

```bash
# Install modal
pip install modal

# Authenticate with Modal
modal setup
```

This will open a browser window to authenticate. Once authenticated, you're ready to deploy.

### Step 2: Create Modal Secret for OpenAI API

```bash
# Create a secret named 'portfolio-rag-mojo' with your OpenAI API key
modal secret create portfolio-rag-mojo \
  OPENAI_API_KEY=your-openai-api-key-here \
  OPENAI_MODEL=gpt-4o-mini \
  EMBEDDING_MODEL=intfloat/multilingual-e5-small
```

You can also create secrets via the [Modal dashboard](https://modal.com/secrets).

### Step 3: Upload FAISS Database to Modal Volume

```bash
# Upload your local FAISS database to Modal's persistent storage
modal run upload_faiss_to_modal.py
```

This script will:
- Create a Modal Volume named `mojo-faiss-db`
- Upload all files from `app/faiss_db` to the volume
- Verify the upload was successful

Expected output:
```
============================================================
🚀 FAISS Database Upload to Modal
============================================================
📤 Uploading FAISS database from local path...
   Source: /path/to/app/faiss_db
   Destination: /data/faiss_db

📂 Found 2 files to upload:
   - index.faiss
   - index.pkl
✓ Uploaded: index.faiss
✓ Uploaded: index.pkl

✅ FAISS database uploaded successfully!
   Volume name: mojo-faiss-db
   Total files: 2

🔍 Verifying FAISS database in Modal Volume...
📂 Found 2 files in volume:
   - index.faiss (0.04 MB)
   - index.pkl (0.03 MB)

✅ FAISS database verified successfully!
============================================================
✅ Upload complete! You can now deploy your app:
   modal deploy modal_app.py
============================================================
```

### Step 4: Deploy the Application

```bash
# Deploy the Flask app to Modal
modal deploy modal_app.py
```

This will:
- Build the container image with all dependencies
- Deploy the Flask application as a Modal WSGI app
- Return a public URL for your application

Expected output:
```
✓ Created objects.
├── 🔨 Created mount /Users/pwlee/Documents/Github/rag-for-mojo/app/static
├── 🔨 Created mount /Users/pwlee/Documents/Github/rag-for-mojo/app/templates
├── 🔨 Created mojo-faiss-db => /data/faiss_db
└── 🔨 Created function MojoRAGApp.*.

✓ App deployed! 🎉

View Deployment: https://modal.com/apps/...

Web endpoint: https://your-workspace--mojo-rag-brand-ambassador-mojoragapp-flask-app.modal.run
```

### Step 5: Test Your Deployment

Visit the URL provided in the deployment output. You should see your RAG chatbot interface.

## 🔧 Configuration

### Environment Variables

The following environment variables are configured via Modal secrets (created in Step 2):

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_MODEL`: OpenAI model to use (default: `gpt-4o-mini`)
- `EMBEDDING_MODEL`: Embedding model (default: `intfloat/multilingual-e5-small`)

### Resource Allocation

Current configuration in `modal_app.py`:

```python
@app.cls(
    cpu=2,              # 2 vCPUs
    memory=2048,        # 2GB RAM
    keep_warm=1,        # Keep 1 container warm
    container_idle_timeout=300,  # 5 minutes idle timeout
)
```

You can adjust these based on your needs:
- **cpu**: More CPUs for faster embedding operations
- **memory**: Increase if you have a large FAISS database
- **keep_warm**: Keep more containers warm for high traffic
- **container_idle_timeout**: How long to keep idle containers alive

### Cost Optimization

To reduce costs:
- Set `keep_warm=0` to scale to zero when idle (higher cold start latency)
- Reduce `container_idle_timeout` to shut down faster
- Use smaller CPU/memory if your traffic is low

## 📊 Monitoring & Logs

### View Logs

```bash
# Stream logs in real-time
modal app logs mojo-rag-brand-ambassador
```

Or view logs in the [Modal dashboard](https://modal.com/apps).

### Monitor Performance

The Modal dashboard provides:
- Request counts and latency
- Container scaling events
- Error rates
- Cost breakdown

## 🔄 Updating Your Deployment

### Update Code

```bash
# Redeploy with latest code changes
modal deploy modal_app.py
```

### Update FAISS Database

If you rebuild your FAISS index:

```bash
# Upload the new database
modal run upload_faiss_to_modal.py

# Restart the deployment to load new data
modal deploy modal_app.py
```

### Update Secrets

```bash
# Update OpenAI API key
modal secret update portfolio-rag-mojo OPENAI_API_KEY=new-key-here
```

## 🧪 Local Testing

You can test the Modal app locally before deploying:

```bash
# Run locally (downloads dependencies to local container)
modal serve modal_app.py
```

This starts a local development server. Note: You still need the FAISS database uploaded to Modal Volume.

## 🐛 Troubleshooting

### FAISS Database Not Found

**Error**: `FileNotFoundError: FAISS database not found`

**Solution**: Make sure you uploaded the FAISS database:
```bash
modal run upload_faiss_to_modal.py
```

### OpenAI API Key Not Found

**Error**: `AuthenticationError: No API key provided`

**Solution**: Create the Modal secret with your API key:
```bash
modal secret create portfolio-rag-mojo OPENAI_API_KEY=your-key-here
```

### Container Timeout During Startup

**Error**: `Container startup timed out`

**Solution**: The embedding model download might be slow. This should only happen on the first deployment. Wait for it to complete, or increase `startup_timeout` in the decorator.

### High Cold Start Latency

**Issue**: First request after idle period is slow

**Solution**: Increase `keep_warm` to keep more containers alive:
```python
@app.cls(keep_warm=2)  # Keep 2 containers warm
```

## 📈 Performance Tips

1. **Keep Warm**: Set `keep_warm=1` or higher to avoid cold starts
2. **Container Timeout**: Adjust `container_idle_timeout` based on traffic patterns
3. **Resource Allocation**: Monitor usage and adjust CPU/memory as needed
4. **Caching**: Modal automatically caches the container image for faster starts

## 🔐 Security Best Practices

1. **Never commit API keys**: Always use Modal secrets
2. **Restrict access**: Use Modal's authentication features if needed
3. **Monitor usage**: Set up alerts for unusual API usage
4. **Rotate keys**: Regularly update your OpenAI API key

## 💰 Cost Estimation

Modal pricing (as of 2024):
- **Compute**: ~$0.0001 per second of CPU usage
- **Memory**: ~$0.00001 per GB-second
- **Storage**: ~$0.10 per GB-month for volumes
- **Free tier**: Includes $10/month credits

Example monthly costs:
- **Low traffic** (100 requests/day, 5s avg): ~$1-2/month
- **Medium traffic** (1000 requests/day, 5s avg): ~$10-15/month
- **High traffic** (10k requests/day, 5s avg): ~$100-150/month

## 📚 Additional Resources

- [Modal Documentation](https://modal.com/docs)
- [Modal Examples](https://modal.com/docs/examples)
- [Modal Community Slack](https://modal.com/slack)
- [Pricing Calculator](https://modal.com/pricing)

## ❓ FAQ

**Q: Can I use a custom domain?**
A: Yes! Modal supports custom domains. See the [custom domains guide](https://modal.com/docs/guide/webhooks#custom-domains).

**Q: How do I add authentication?**
A: You can add Flask authentication middleware or use Modal's built-in auth features.

**Q: Can I use GPU?**
A: Yes! Change `cpu=2` to `gpu="any"` or specify a GPU type like `gpu="T4"`.

**Q: How do I set up CI/CD?**
A: Use Modal's GitHub Actions integration or call `modal deploy` in your CI pipeline.

**Q: What's the maximum request timeout?**
A: Default is 5 minutes. You can increase with `timeout=600` (in seconds).

---

## 🎉 You're All Set!

Your RAG chatbot is now running on Modal's serverless infrastructure. Enjoy automatic scaling, cost efficiency, and zero infrastructure management!

For questions or issues, check the [troubleshooting section](#-troubleshooting) or reach out to Modal support.
