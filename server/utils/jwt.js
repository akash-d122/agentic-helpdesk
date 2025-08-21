const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const winston = require('winston');

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets must be defined in environment variables');
    }
  }

  // Generate access token
  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'smart-helpdesk',
        audience: 'smart-helpdesk-users'
      });
    } catch (error) {
      winston.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'smart-helpdesk',
        audience: 'smart-helpdesk-users'
      });
    } catch (error) {
      winston.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Generate both tokens
  generateTokens(user) {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ id: payload.id });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry
    };
  }

  // Verify access token
  async verifyAccessToken(token) {
    try {
      const decoded = await promisify(jwt.verify)(token, this.accessTokenSecret, {
        issuer: 'smart-helpdesk',
        audience: 'smart-helpdesk-users'
      });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      } else {
        winston.error('Error verifying access token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token) {
    try {
      const decoded = await promisify(jwt.verify)(token, this.refreshTokenSecret, {
        issuer: 'smart-helpdesk',
        audience: 'smart-helpdesk-users'
      });
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        winston.error('Error verifying refresh token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      winston.error('Error decoding token:', error);
      return null;
    }
  }

  // Get token expiration time
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      winston.error('Error getting token expiration:', error);
      return null;
    }
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      return expiration ? expiration < new Date() : true;
    } catch (error) {
      return true;
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // Generate password reset token
  generatePasswordResetToken(userId) {
    try {
      return jwt.sign(
        { id: userId, type: 'password_reset' },
        this.accessTokenSecret,
        {
          expiresIn: '1h',
          issuer: 'smart-helpdesk',
          audience: 'smart-helpdesk-users'
        }
      );
    } catch (error) {
      winston.error('Error generating password reset token:', error);
      throw new Error('Failed to generate password reset token');
    }
  }

  // Verify password reset token
  async verifyPasswordResetToken(token) {
    try {
      const decoded = await promisify(jwt.verify)(token, this.accessTokenSecret, {
        issuer: 'smart-helpdesk',
        audience: 'smart-helpdesk-users'
      });

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Password reset token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid password reset token');
      } else {
        winston.error('Error verifying password reset token:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  // Generate email verification token
  generateEmailVerificationToken(userId) {
    try {
      return jwt.sign(
        { id: userId, type: 'email_verification' },
        this.accessTokenSecret,
        {
          expiresIn: '24h',
          issuer: 'smart-helpdesk',
          audience: 'smart-helpdesk-users'
        }
      );
    } catch (error) {
      winston.error('Error generating email verification token:', error);
      throw new Error('Failed to generate email verification token');
    }
  }

  // Verify email verification token
  async verifyEmailVerificationToken(token) {
    try {
      const decoded = await promisify(jwt.verify)(token, this.accessTokenSecret, {
        issuer: 'smart-helpdesk',
        audience: 'smart-helpdesk-users'
      });

      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Email verification token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid email verification token');
      } else {
        winston.error('Error verifying email verification token:', error);
        throw new Error('Token verification failed');
      }
    }
  }
}

// Create singleton instance
const jwtService = new JWTService();

module.exports = jwtService;
